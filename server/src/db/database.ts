import Database from "better-sqlite3"
import { randomUUID } from "crypto"
import { Player, User } from "../types.js"
import { DatabaseError, errDatabase } from "@app/shared/errors.js"
import { DEFAULT_AVATAR_FILENAME } from '../utils/consts.js'
import { paths } from '../config/paths.js'
import { getDatabase } from "./databaseSingleton.js";
import { timeStamp } from "console";
	
/**
 * @brief Validates alias format and constraints
 * @param alias The alias string to validate
 * @throws Error if alias is invalid
 */
function checkAliasValidity(alias: string): void
{
	if (!alias || alias.trim().length < 3)
		throw new DatabaseError("Alias cannot be less than 3 characters");
	if (alias.length > 20)
		throw new DatabaseError("Alias too long (max 20 characters");
	if (!/^[a-zA-Z0-9_ !@#$%&*=-]+$/.test(alias))
		throw new DatabaseError("Alias contains at least one invalid character");
}

export class DatabaseService {
	
	private db: any;

	constructor() {
		const dbPath = process.env.DB_PATH || 'transcendaire.db'
		this.db = new Database(dbPath);
		this.setDatabase();
	}

	/**
	 * @brief Initializes the database schema by creating the  necessary tables if they do not exist.
	 *
	 * This method sets up tables for players, tournaments, and matches, including their relationships and constraints.
	 */
	private setDatabase(): void {
		this.db.exec(
			`CREATE TABLE IF NOT EXISTS users (
			id TEXT UNIQUE PRIMARY KEY,
			login TEXT UNIQUE NOT NULL, 
			password TEXT, -- this is hashed
			alias TEXT UNIQUE NOT NULL, -- pseudo but called it alias for concordance
			created_at INTEGER NOT NULL,
			avatar TEXT DEFAULT 'Transcendaire.png',
			tournament_alias TEXT,
			games_played INTEGER DEFAULT 0,
			games_won INTEGER DEFAULT 0,
			online BOOLEAN DEFAULT false 
			);
			CREATE TABLE IF NOT EXISTS users_cookies (
			user_id TEXT NOT NULL,
			session_id TEXT NOT NULL,
			created_at INTEGER NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
			);
			CREATE TABLE IF NOT EXISTS players (
			id TEXT PRIMARY KEY,
			alias TEXT UNIQUE NOT NULL,
			created_at INTEGER NOT NULL,
			status TEXT NOT NULL
			);
            CREATE TABLE IF NOT EXISTS friend_requests (
            id TEXT PRIMARY KEY,
            from_user_id TEXT NOT NULL,
            to_user_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            UNIQUE(from_user_id, to_user_id),
            FOREIGN KEY(from_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(to_user_id) REFERENCES users(id) ON DELETE CASCADE
            );
			CREATE TABLE IF NOT EXISTS friends (
			user_id TEXT NOT NULL,
			friend_id TEXT NOT NULL,
			since INTEGER NOT NULL,
			PRIMARY KEY (user_id, friend_id),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(friend_id) REFERENCES users(id) ON DELETE CASCADE
			);
			CREATE TABLE IF NOT EXISTS tournaments (
			  id TEXT PRIMARY KEY,
			  name TEXT NOT NULL,
			  curr_nb_players INTEGER NOT NULL,
			  max_players INTEGER NOT NULL,
			  status TEXT NOT NULL,
			  created_at INTEGER NOT NULL
			);
			CREATE TABLE IF NOT EXISTS tournament_players (
			tournament_id TEXT NOT NULL,
			player_id TEXT NOT NULL,
			alias TEXT NOT NULL,
			joined_at INTEGER NOT NULL,
			PRIMARY KEY (tournament_id, player_id),
			FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
			FOREIGN KEY(player_id) REFERENCES players(id)
			);
			CREATE TABLE IF NOT EXISTS matches (
			  id TEXT PRIMARY KEY,
			  tournament_id TEXT NOT NULL,
			  player_a_id TEXT NOT NULL,
			  player_b_id TEXT NOT NULL,
			  alias_a TEXT NOT NULL,
			  alias_b TEXT NOT NULL,
			  score_a INTEGER DEFAULT 0,
			  score_b INTEGER DEFAULT 0,
			  state TEXT NOT NULL,
			  created_at INTEGER NOT NULL,
			  FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
			  FOREIGN KEY(player_a_id) REFERENCES players(id),
			  FOREIGN KEY(player_b_id) REFERENCES players(id)
			);
			CREATE TABLE IF NOT EXISTS match_history (
			  id TEXT PRIMARY KEY,
			  player_id TEXT NOT NULL,
			  player_alias TEXT NOT NULL,
			  game_type TEXT NOT NULL,
			  opponent_info TEXT NOT NULL,
			  player_count INTEGER NOT NULL,
			  bot_count INTEGER DEFAULT 0,
			  score_for INTEGER NOT NULL,
			  score_against INTEGER NOT NULL,
			  position INTEGER,
			  position_with_bots INTEGER,
			  result TEXT NOT NULL,
			  tournament_id TEXT,
			  created_at INTEGER NOT NULL,
			  FOREIGN KEY(player_id) REFERENCES players(id)
			);
			CREATE TABLE IF NOT EXISTS tournament_results (
			  id TEXT PRIMARY KEY,
			  player_id TEXT NOT NULL,
			  player_alias TEXT NOT NULL,
			  tournament_id TEXT NOT NULL,
			  tournament_name TEXT NOT NULL,
			  position INTEGER NOT NULL,
			  total_participants INTEGER NOT NULL,
			  matches_won INTEGER NOT NULL,
			  matches_lost INTEGER NOT NULL,
			  created_at INTEGER NOT NULL,
			  FOREIGN KEY(player_id) REFERENCES players(id),
			  FOREIGN KEY(tournament_id) REFERENCES tournaments(id)
			);
		`);
	}



				//*******************************          USERS         ************************************ */

	/**
	 * @brief Creates a new user account
	 * @param login Private login for authentication
	 * @param password Hashed password
	 * @param publicLogin Public display name
	 * @returns Generated UUID for the created user
	 * @note No parsing is done here because the server does it before calling this method.
	 */
	public createUser(login: string, hashedPassword: string, alias: string): string 
	{
		const id = randomUUID();
		const currDate = Date.now();

		this.db.prepare(`
			INSERT INTO users (id, login, password, alias, created_at, avatar)
			VALUES (?, ?, ?, ?, ?, ?)`
		).run(id, login.trim(), hashedPassword, alias.trim(), currDate, DEFAULT_AVATAR_FILENAME);
		this.createPlayer(alias, id, currDate);

		return id;
	}


	public generateUniqueAlias(baseAlias: string): string
	{
	    const MAX_ALIAS_LENGTH = 24;
	    let alias = baseAlias.trim();
	
	    if (alias.length > MAX_ALIAS_LENGTH)
	        alias = alias.substring(0, MAX_ALIAS_LENGTH).trim();
	
	    if (!this.getUserByAlias(alias))
	        return alias;
	
	    let counter = 1;
	    let candidateAlias = `${alias}${counter}`;
	
	    while (this.getUserByAlias(candidateAlias))
	    {
	        counter++;
	        candidateAlias = `${alias}${counter}`;
		
	        if (candidateAlias.length > MAX_ALIAS_LENGTH)
	        {
	            const numLength = counter.toString().length;
	            const maxBaseLength = MAX_ALIAS_LENGTH - numLength;
	            alias = baseAlias.substring(0, maxBaseLength).trim();
	            candidateAlias = `${alias}${counter}`;
	        }
	    }
	
	    return candidateAlias;
	}

							//******************   GET        ************************ */

	public getUserByLogin(login: string): User | undefined
	{
		return this.db.prepare('SELECT * FROM users where login = ?').get(login);
	}

	public getUserById(id: string)
	{
		return this.db.prepare('SELECT * FROM users where id = ?').get(id);
	}

	public getUserByAlias(alias: string)
	{
		return this.db.prepare('SELECT * FROM users where alias = ?').get(alias);
	}

	public getUserAvatar(userId: string): string | undefined
	{
		const result = this.db.prepare('SELECT avatar FROM users WHERE id = ?').get(userId) as { avatar: string } | undefined;
		return result?.avatar;
	}

	/**
	 * @brief Sets user online status
	 * @param userId User's UUID
	 * @param online Boolean (1 for online, 0 for offline)
	 */
	public setUserOnlineStatus(userId: string, online: boolean) : void
	{
		this.db.prepare('UPDATE users SET online = ? WHERE id = ?').run(online ? 1 : 0, userId);//! check if it works with a boolean
	}


							//********************** UPDATES       ********************************* */

	/**
	 * @brief Updates user's game statistics
	 * @param userId User's UUID
	 * @param won Whether the user won the game
	 */
	public updateUserStats(userId: string, won: boolean): void 
	{
		if (won)
			this.db.prepare('UPDATE users SET games_played = games_played + 1, games_won + 1 WHERE id = ?').run(userId);
		else
			this.db.prepare('UPDATE users SET games_played = games_played + 1 WHERE id = ?').run(userId);
	}

	/**
	 * @brief Updates user's alias
	 * @param userId User's UUID
	 * @param newAlias New alias
	 * @note No check is done on newAlias (alias' validity, because the server already did it)
	 */
	public updateUserAlias(userId: string, newAlias: string): void
	{
		const aliasAlreadyTaken = this.db.prepare('SELECT id FROM users WHERE alias = ?').get(newAlias.trim());

		if (aliasAlreadyTaken && aliasAlreadyTaken.id != userId)
			throw new DatabaseError('Le pseudo choisi est déjà pris', errDatabase.ALIAS_ALREADY_TAKEN);

		//*in users table
		this.db.prepare('UPDATE users SET alias = ? WHERE id = ?').run(newAlias, userId);

		//* in players table
		this.updatePlayerAlias(userId, newAlias);

		//*in tournament_players table
		this.db.prepare('UPDATE tournament_players SET alias = ? WHERE player_id = ?').run(newAlias, userId);

		this.db.prepare(`
			UPDATE matches 
			SET alias_a = CASE WHEN player_a_id = ? THEN ? ELSE alias_a END,
				alias_b = CASE WHEN player_b_id = ? THEN ? ELSE alias_b END
			WHERE player_a_id = ? OR player_b_id = ?
		`).run(userId, newAlias.trim(), userId, newAlias.trim(), userId, userId);
	}

    /**
     * @brief Updates user's password
     * @param userId User's UUID
     * @param hashedPassword New hashed password
     */
    public updateUserPassword(userId: string, hashedPassword: string): void
	{
        this.db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);
    }


	public updateUserAvatar(userId: string, avatarFilename: string): void
	{
		this.db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatarFilename, userId);
	}


								//************* COOKIES ***************/

	public createOrUpdateSession(userId: string): string
	{
		const sessionId = randomUUID();
		const existingSession = this.db.prepare('SELECT 1 FROM users_cookies WHERE user_id = ?').get(userId);
		const now = Date.now();

		if (existingSession)
			this.db.prepare('UPDATE users_cookies SET session_id = ?, created_at = ? WHERE user_id = ?').run(sessionId, now, userId);
		else
			this.db.prepare('INSERT into users_cookies (user_id, session_id, created_at) VALUES (?, ?, ?)').run(userId, sessionId, now);

		return sessionId;
	}

	public getUserBySessionId(sessionId: string): User | undefined
	{
		const result = this.db.prepare(`
        	SELECT u.* 
        	FROM users u
        	JOIN users_cookies uc ON uc.user_id = u.id
        	WHERE uc.session_id = ?
    	`).get(sessionId) as User | undefined;

    	return result;
	}


	public deleteSession(userId: string): void
	{
		this.db.prepare('DELETE FROM users_cookies WHERE user_id = ?').run(userId);
	}
	

	public deleteSessionById(sessionId: string): void
	{
		this.db.prepare('DELETE FROM users_cookies WHERE session_id = ?').run(sessionId);
	}

								//********* FRIENDS ******************/
    /**
     * @brief Send a friend request to another user
     * @param fromUserId Sender's user ID
     * @param toUserAlias Recipient's alias
     * @throws DatabaseError if target not found, trying to add self, already friends, or request already exists
     */
	public sendFriendRequest(fromUserId: string, toUserAlias: string): string
	{
		const userToAdd = this.getUserByAlias(toUserAlias);

		if (!userToAdd || !userToAdd.id)
			throw new DatabaseError('L\'utilisateur n\'existe pas', undefined, 400);
		
		if (userToAdd.id === fromUserId)
			throw new DatabaseError('Impossible de s\'ajouter soi-même en ami', undefined, 400);

		const alreadyFriends = this.db.prepare(
			'SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?'
		).get(fromUserId, userToAdd.id);

		if (alreadyFriends)
			throw new DatabaseError(`Vous êtes déjà ami avec ${toUserAlias}`, undefined, 400);

		const existingRequest = this.db.prepare(
			'SELECT 1 FROM friend_requests WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)'
		).get(fromUserId, userToAdd.id, userToAdd.id, fromUserId);

		if (existingRequest)
			throw new DatabaseError('Une demande d\'ami existe déjà entre vous', undefined, 400);

		const requestId = randomUUID();
		this.db.prepare(
			'INSERT INTO friend_requests (id, from_user_id, to_user_id, created_at) VALUES (?, ?, ?, ?)'
		).run(requestId, fromUserId, userToAdd.id, Date.now());
		return requestId;
	}

	/**
     * @brief Get all pending friend requests received by a user
     * @param userId User's ID
     * @returns Array of pending requests with sender info
     */
    public getPendingFriendRequests(userId: string): any[]
	{
        return this.db.prepare(`
            SELECT r.id, r.from_user_id, u.alias as from_alias, r.created_at
            FROM friend_requests r
            JOIN users u ON u.id = r.from_user_id
            WHERE r.to_user_id = ?
            ORDER BY r.created_at DESC
        `).all(userId);
    }

    /**
     * @brief Get all friend requests sent by a user
     * @param userId User's ID
     * @returns Array of sent requests with recipient info
     */
    public getSentFriendRequests(userId: string): any[]
	{
        return this.db.prepare(`
            SELECT r.id, r.to_user_id, u.alias as to_alias, r.created_at
            FROM friend_requests r
            JOIN users u ON u.id = r.to_user_id
            WHERE r.from_user_id = ?
            ORDER BY r.created_at DESC
        `).all(userId);
    }

    /**
     * @brief Handles a friend request (accepting or rejecting)
     * @param userId User receiving the request (recipient)
     * @param fromAlias Alias of the user who sent the request
	 * @param accept Boolean being true if recipient accepts the request and false otherwise
     * @throws DatabaseError if sender not found or request doesn't exist
     */
	public handleFriendRequest(userId: string, fromAlias: string, accept: boolean): void
	{
		const sender = this.getUserByAlias(fromAlias);

        if (!sender)
            throw new DatabaseError("L'utilisateur ayant envoyé la demande d\'ami est introuvable", undefined, 404);
        
        const request = this.db.prepare(
            "SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?"
        ).get(sender.id, userId);
        
        if (!request)
            throw new DatabaseError("Demande d'ami introuvable", undefined, 404);

		if (accept)
		{
			const now = Date.now();
			
			this.db.prepare(
				'INSERT INTO friends (user_id, friend_id, since) VALUES (?, ?, ?)'
			).run(userId, sender.id, now);
			
			this.db.prepare(
				'INSERT INTO friends (user_id, friend_id, since) VALUES (?, ?, ?)'
			).run(sender.id, userId, now);
		}
		
		this.db.prepare(
			'DELETE FROM friend_requests WHERE id = ?'
		).run(request.id);

	}

    /**
     * @brief Cancel a sent friend request
     * @param userId User canceling the request (sender)
     * @param toAlias Alias of the intended recipient
     * @throws DatabaseError if recipient not found
     */
	public cancelFriendRequest(userId: string, toAlias: string): void
	{
		const recipient = this.getUserByAlias(toAlias);

		if (!recipient)
			throw new DatabaseError("Utilisateur introuvable", undefined, 404);

		this.db.prepare(
			'DELETE FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?'
		).run(userId, recipient.id);
	} 

    /**
     * @brief Get all friends with their online status
     * @param userId User's ID
     * @returns Array of friends with { id, alias, online, since }
     */
	public getFriends(userId: string): any[]
	{
		const friends = this.db.prepare(`
			SELECT u.id, u.alias, u.online, f.since, u.avatar
			FROM friends f
			JOIN users u ON u.id = f.friend_id
			WHERE f.user_id = ?
			ORDER BY u.alias ASC
			`).all(userId);

		return friends.map((f: any) => ({
			...f,
			avatar: f.avatar 
				? `/avatars/users/${f.avatar}` 
				: `/avatars/defaults/${DEFAULT_AVATAR_FILENAME}`
		}));
	}

	public getFriendsWithAlias(alias: string): any[]
	{
		const idObject = this.db.prepare("SELECT id FROM users WHERE alias = ?").get(alias);

		if (!idObject || !idObject.id)
			return [];

		const friends = this.getFriends(idObject.id);
		return friends;
	}

    /**
     * @brief Remove a friend (bidirectional)
     * @param userId Current user's ID
     * @param friendAlias Alias of friend to remove
     * @throws DatabaseError if friend not found
     */
	public removeFriend(userId: string, friendAlias: string): void
	{
		const friend = this.getUserByAlias(friendAlias);

		if (!friend)
			throw new DatabaseError('Utilisateur introuvable', undefined, 404);

		this.db.prepare(
			'DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)'
		).run(userId, friend.id, friend.id, userId);
	}

    /**
     * @brief Check if two users are friends
     * @param userId First user's ID
     * @param friendId Second user's ID
     * @returns True if friends, false otherwise
     */
	public areFriends(userId: string, friendId: string): boolean
	{
		const result = this.db.prepare(
			'SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?'
		).get(userId, friendId);

		return (result > 0);
	}

	/**
	 * @brief Get friendship status between current user and target alias
	 * @param userId Current user's ID
	 * @param targetAlias Target user's alias
	 * @returns 'friends' | 'pending-sent' | 'pending-received' | 'none'
	 */
	public getFriendshipStatus(userId: string, targetAlias: string): string
	{
		const target = this.getUserByAlias(targetAlias)
		if (!target)
			return 'none'

		const isFriend = this.db.prepare(
			'SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?'
		).get(userId, target.id)
		if (isFriend)
			return 'friends'

		const sentRequest = this.db.prepare(
			'SELECT 1 FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?'
		).get(userId, target.id)
		if (sentRequest)
			return 'pending-sent'

		const receivedRequest = this.db.prepare(
			'SELECT 1 FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?'
		).get(target.id, userId)
		if (receivedRequest)
			return 'pending-received'

		return 'none'
	}


							//*******   PLAYERS     **********/
	/**
	 * @brief Creates a new player in the database
	 * @param alias Unique player alias
	 * @params id User's UUID
	 * @params currDate Current date at creation of the user in the database
	 * @returns Generated UUID for the created player
	 * @note This function is called when a new user registers. 
	 * @note No check is done here, since server already handled parsing/duplicate issues
	 */
	public createPlayer(alias: string, id: string, currDate: number): string 
	{
		this.db.prepare("INSERT INTO players (id, alias, created_at, status) VALUES (?, ?, ?, ?)").run(id, alias.trim(), currDate, 'created');
		return id;
	}

	/**
	 * @brief Retrieves a player by their alias
	 * @param alias The player's alias to search for
	 * @returns Player object if found, undefined otherwise
	 */
	public getPlayer(alias: string): (Player | undefined)
	{
		return this.db.prepare("SELECT * FROM players WHERE alias= ?").get(alias) as (Player | undefined);
	}

	/**
	 * @brief Checks if a player with a given alias exists
	 * @param alias The alias to check
	 * @returns True if player exists, false otherwise
	 */
	public playerExists(alias: string): boolean
	{
		if (!alias || alias === undefined)
			return false;
		const check = (this.db.prepare("SELECT 1 FROM players WHERE alias= ?").get(alias)) !== undefined
		return (this.db.prepare("SELECT 1 FROM players WHERE alias= ?").get(alias)) !== undefined
	}

		/**
	 * @brief Checks if a player with a given alias exists in a tournament
	 * @param alias The alias to check
	 * @returns True if player exists in a tournament, false otherwise
	 */
	public playerExistsInTournament(alias: string): boolean
	{
		if (!alias || alias === undefined)
			return false;
		const check = (this.db.prepare("SELECT 1 FROM tournament_players WHERE alias= ?").get(alias)) !== undefined
		return (this.db.prepare("SELECT 1 FROM tournament_players WHERE alias= ?").get(alias)) !== undefined
	}

	/**
	 * @brief Updates a player's alias
	 * @param id Player's UUID
	 * @param newAlias New alias to set
	 * @returns True if update successful, false otherwise
	 * @throws Error if player not found, alias invalid, or alias already taken
	 */
	public updatePlayerAlias(id: string, newAlias: string): boolean 
	{
		const existingPlayer = this.db.prepare("SELECT id FROM players WHERE alias = ?").get(newAlias.trim()) as { id: string } | undefined;
		const result = this.db.prepare("UPDATE players SET alias = ? WHERE id = ?").run(newAlias.trim(), id);

		if (!newAlias || newAlias.trim().length < 3)
			throw new DatabaseError("Le nom doit faire au moins trois caractères");

		if (!this.db.prepare("SELECT 1 FROM players WHERE id = ?").get(id))
			throw new DatabaseError("Player not found");
		if (existingPlayer && existingPlayer.id !== id) 
			throw new DatabaseError("Le nom de joueur est déjà pris");
		return result.changes > 0;
	}

	/**
	 * @brief Gets total number of players in database
	 * @returns Count of players
	 */
	public getPlayerCount(): number
	{
		const result = this.db.prepare("SELECT COUNT(*) as count FROM players").get() as { count: number };

		return result.count;
	}

	/**
	 * @brief Retrieves a player by specified column and value in the players table
	 * @param type Column name to search by
	 * @param value Value to search for
	 * @returns Player object if found, undefined otherwise
	 * @throws Error if invalid search type
	 */
	public getPlayerBy(type: string, value: string): (Player | undefined) 
	{
		const columnMap: Record<string,string> = {
			"id": "SELECT * FROM players WHERE id= ?",
			"alias": "SELECT * FROM players WHERE alias= ?",
			"created_at": "SELECT * FROM players WHERE created_at= ?",
			"all": "SELECT * FROM players"
		};
		const query: string | undefined = columnMap[type];

		if (!query)
			throw new DatabaseError(`Invalid data request in ${type}`);
		return this.db.prepare(query).get(value) as (Player | undefined);
	}

	/**
	 * @brief Removes a player from the database
	 * @param id Player's UUID to remove
	 * @returns True if deletion successful, false if player not found
	 * @throws Error if ID is invalid
	 */
	public removePlayer(id: string): boolean
	{
		if (!id || id.trim().length < 3)
			throw new DatabaseError("Le nom doit faire au moins trois caractères");

		const result = this.db.prepare("DELETE FROM players WHERE id= ?").run(id);
		return result.changes > 0;
	}

	/**
	 * @brief Retrieves all players from database
	 * @returns Array of all player objects
	 */
	public getAllPlayers(): Player[]
	{
		return this.db.prepare("SELECT * FROM players").all() as Player[];
	}

	//ToDo change this function so tha it can work with all tables and variables?
	/**
	 * @brief Gets specific column data from all players
	 * @param type Column name to retrieve
	 * @returns Array of column values or full player objects
	 * @throws Error if invalid column type
	 */
	public getColumnsBy(type: 'id' | 'alias' | 'created_at' | 'all'): any[] 
	{
		const columnMap: Record<string, string> = {
			"id": "SELECT id FROM players",
			"alias": "SELECT alias FROM players",
			"created_at": "SELECT created_at FROM players",
			"all": "SELECT * FROM players"
		};
		const query: string | undefined = columnMap[type];

		if (!query)
			throw new DatabaseError(`Invalid data request in ${type}`); //? Is this check really necessary with user-defined type
		return this.db.prepare(query).all();
	}

	/**
	* @brief Print all players to console (development only)
	*/
	public printPlayers(): void
	{	
		const dbPlayers = this.db.prepare("SELECT * FROM players").all() as Player[];

		dbPlayers.forEach((p: Player) =>  console.log("player :", p));
	}


	/**
	 * @brief Retrieves matches by tournament ID or match ID
	 * @param tournamentId Optional tournament UUID
	 * @param matchId Optional match UUID
	 * @returns Array of matching records
	 * @throws {DatabaseError} If neither parameter is provided
	 */
	public getMatches(tournamentId?: string, matchId?: string) 
	{
		if (!tournamentId && !matchId)
			throw new DatabaseError("getMatchById: at least one of tournamentId or matchId is needed");
		
		let query: string = "SELECT * FROM matches WHERE ";
		if (tournamentId)
		{
			query += "tournament_id = ?";
			return this.db.prepare(query).all(tournamentId);
		}
		if (matchId)
		{
			query += "id = ?";
			return this.db.prepare(query).all(matchId);
		}
		return;
	}

	/**
	 * @brief Deletes all records from all tables
	 * @warning Permanently deletes all data - use with caution
	 */
	public deleteAll()
	{
		this.db.pragma('foreign_keys = OFF');
		this.db.prepare("DELETE FROM players").run()
		this.db.prepare("DELETE FROM tournament_players").run()
		this.db.prepare("DELETE FROM tournaments").run()
		this.db.prepare("DELETE FROM matches").run()
		this.db.pragma('foreign_keys = ON');
	}

	/**
	 * @brief Closes database connection and deletes the database file
	 * @warning Permanent operation - all data will be lost
	 */
	public deleteDatabase()
	{
		this.db.close();

    	const fs = require('fs'); 
    	if (fs.existsSync('transcendaire.db'))
        	fs.unlinkSync('transcendaire.db');
	}

	/**
	 * @brief Gets name/alias of a record by ID from specified table
	 * @param id Record UUID
	 * @param table Table to query ('players', 'tournaments', 'tournament_players', 'matches')
	 * @returns Object with name/alias field(s), or undefined if not found
	 */
	public getNameById(id: string, table: 'players' | 'tournaments' | 'tournament_players' | 'matches')
	{
		let query: string = "";

		switch (table)
		{
			case "players":
				query = "SELECT alias FROM players WHERE id = ?";
				break ;
			case "tournaments":
				query = "SELECT name FROM tournaments WHERE id = ?";
				break ;
			case "tournament_players":
				query = "SELECT alias FROM tournament_players WHERE id = ?";
				break ;
			case "matches":
				query = "SELECT alias_a, alias_b FROM matches WHERE id = ?";
		}
		return this.db.prepare(query).get(id);
	}
													//* TOURNAMENT FUNCTIONS

	/**
	 * @brief Retrieves a tournament by ID or name
	 * @param id Optional tournament UUID to search by
	 * @param name Optional tournament name to search by
	 * @returns Tournament object if found, undefined otherwise
	 * @throws Error if neither id nor name is provided
	 */
	public getTournament(id?: string, name?: string)
	{
		if (!id && !name)
			throw new DatabaseError("getTournament: at least one of id or name is needed")
		
		let query: string = "SELECT * FROM tournaments WHERE"
		if (id)
		{
			query += " id= ?";
			return this.db.prepare(query).get(id);
		}
		if (name)
		{
			query += " name= ?";
			return this.db.prepare(query).get(name);
		}
	}

	/**
	 * @brief Retrieves all tournaments from database
	 * @returns Array of all tournament objects
	 */
	public getAllTournaments()
	{
		 return this.db.prepare("SELECT * FROM tournaments").all();
	}

	/**
	 * @brief Retrieves all tournaments from the database that match the specified status.
	 * 
	 * @description
	 * Queries the tournaments table and returns all tournament records where the status
	 * column matches the provided status parameter. This method performs a simple
	 * SELECT query with a WHERE clause filtering by tournament status.
	 * 
	 * @param string status - The status value to filter tournaments by (e.g., 'active', 'completed', 'pending')
	 * @returns An array of tournament objects matching the specified status. Returns an empty array if no matches are found.
	 * 
	 */
	public getTournamentsByStatus(status: string): any[] 
	{
		return this.db.prepare("SELECT * FROM tournaments WHERE status = ?").all(status);
	}

	/**
	 * @brief Retrieve all players associated with a tournament.
	 *
	 * Retrieves all rows from the `tournament_players` table that match the given
	 * tournament ID. The query is parameterized to prevent SQL injection.
	 *
	 * @param tournamentId - The ID of the tournament to fetch players for. Must be a non-empty string.
	 * @throws {DatabaseError} When `tournamentId` is falsy/empty.
	 */
	public getTournamentPlayers(tournamentId: string)
	{
		if (!tournamentId)
			throw new DatabaseError("getTournamentPlayers: tournament ID cannot be empty");
		return this.db.prepare("SELECT * FROM tournament_players WHERE tournament_id = ?").all(tournamentId);
	}


	//ToDo add a filler if players are even (with AI players);
	/**
	 * @brief Creates a new tournament in the database
	 * @param name Unique name for the tournament
	 * @param maxPlayers Maximum number of players allowed in the tournament
	 * @returns Generated UUID for the created tournament
	 * @throws Error if tournament name already exists or database operation fails
	 */
	public createTournament(name:string, maxPlayers:number): string
	{
		if (this.getTournament(undefined, name))
			throw new DatabaseError(`Le tournoi ${name} existe déjà et ne peut pas être créé`);

		if (maxPlayers % 2)
			throw new DatabaseError("Le nombre de joueurs au sein d'un tournoi doit être pair")
		if (maxPlayers < 2 || maxPlayers > 64)
			throw new DatabaseError("Le nombre de joueurs au sein d'un tournoi doit être entre 2 et 64")
	
		const id = randomUUID();
		this.db.prepare("INSERT INTO tournaments (id, name, curr_nb_players, max_players, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
		).run(id, name, 0, maxPlayers, 'created', Date.now());

		return id;
	}

	/**
	 * @brief Adds a player to a tournament, creating the player if they don't exist
	 * @param alias Player's alias to add to the tournament
	 * @param tournamentId UUID of the tournament to join
	 * @param tournamentName Name of the tournament (used for error messages)
	 * @throws Error if alias is invalid, tournament doesn't exist, tournament is full, or player is already registered
	 */
	public addPlayerToTournament(alias: string, tournamentId: string, tournamentName: string): void
	{
		checkAliasValidity(alias);

		const tournament = this.getTournament(tournamentId);
		if (!tournament)
			throw new DatabaseError(`Le tournoi ${tournamentName} n'existe pas`);
		
		if (tournament.curr_nb_players === tournament.max_players)
			throw new DatabaseError(`Impossible d'ajouter ${alias}: le tournoi ${tournamentName} est déjà plein`);

		let player = this.getPlayer(alias);
		if (!player) //!
		{
			const id = this.createPlayer(alias, randomUUID(), Date.now());
			player = this.getPlayerBy('id', id);
		}
			// throw new DatabaseError('Impossible d\'ajouter le joueur au tournoi : le joueur n\'existe pas', errDatabase.PLAYER_NOT_FOUND);

		const playerAlreadyInTournament = this.db.prepare("SELECT 1 FROM tournament_players WHERE tournament_id = ? AND player_id = ?"
		).get(tournamentId, player!.id);
		if (playerAlreadyInTournament)
			throw new DatabaseError(`Le joueur ${alias} existe déjà dans le tournoi ${tournamentName}`)

		this.db.prepare("INSERT INTO tournament_players (tournament_id, player_id, alias, joined_at) VALUES (?, ?, ?, ?)"
		).run(tournamentId, player!.id, alias, Date.now());

		this.db.prepare("UPDATE tournaments SET curr_nb_players = curr_nb_players + 1 WHERE id = ?").run(tournamentId);
	}

	/**
	 * @brief Removes a player from a tournament.
	 
	 * @param alias - The player's alias used to look up the player record.
	 * @param tournamentId - The unique identifier of the tournament.
	 * @param tournamentName - The human-readable tournament name (used only in error messages).
	 *
	 * @throws {Error} If the player with the given alias cannot be found.
	 * @throws {Error} If the player is not a member of the specified tournament.
	 */
	public removePlayerFromTournament(alias: string, tournamentId: string, tournamentName: string): void
	{
		const player = this.getPlayer(alias);
		if (!player)
			throw new DatabaseError(`Le joueur ${alias} n'existe pas`);

		const result = this.db.prepare(
			"DELETE FROM tournament_players WHERE tournament_id = ? AND player_id = ?"
		).run(tournamentId, player.id);

		if (result.changes === 0)
			throw new DatabaseError(`Le joueur ${alias} n'est pas dans le tournoi ${tournamentName}`);

		this.db.prepare(
			"UPDATE tournaments SET curr_nb_players = curr_nb_players - 1 WHERE id = ?"
		).run(tournamentId);
	}

	/**
	 * @brief Updates the status of a tournament
	 * @param status New status value to set
	 * @param tournamentId UUID of the tournament to update
	 * @throws Error if tournament not found or database operation fails
	 */
	public setTournamentStatus(status: 'created' | 'full' | 'running' | 'completed', tournamentId: string): void 
	{
		this.db.prepare("UPDATE tournaments SET status = ? WHERE id = ?").run(status, tournamentId);
	}

	/**
	 * @brief Records the result of a match between two players in a tournament
	 * @param tournamentId UUID of the tournament where the match took place
	 * @param tournamentName Name of the tournament (used for error messages)
	 * @param p1ID UUID of the first player
	 * @param p2ID UUID of the second player
	 * @param scoreA Score achieved by the first player
	 * @param scoreB Score achieved by the second player
	 * @throws Error if required parameters are missing, players are the same, tournament doesn't exist, or players are not registered in the tournament
	 */
	public recordMatch(tournamentId: string, tournamentName: string, p1ID: string, p2ID: string,
		scoreA: number, scoreB: number, status: 'pending' | 'running' | 'completed'): string 
	{
		if (!tournamentId || !p1ID || !p2ID)
			throw new DatabaseError("recordMatch: tournamentId, player1ID and player2ID needed");
		
		if (p1ID === p2ID)
			throw new DatabaseError("recordMatch: player1ID and player2ID cannot be the same");

		const tournament = this.getTournament(tournamentId);
		if (!tournament)
			throw new DatabaseError(`recordMatch: ${tournamentName} tournament doesn't exist`)

		if (status === "completed")
		{
			let playerAExists = this.db.prepare("SELECT 1 FROM tournament_players WHERE tournament_id = ? AND player_id = ?").get(tournamentId, p1ID);
			let playerBExists = this.db.prepare("SELECT 1 FROM tournament_players WHERE tournament_id = ? AND player_id = ?").get(tournamentId, p2ID);
			
			if (!playerAExists)
				throw new DatabaseError(`recordMatch: first player not found in tournament ${tournamentId}`);
			if (!playerBExists)
				throw new DatabaseError(`recordMatch: second player not found in tournament ${tournamentId}`);
		}

		const matchId = randomUUID();
		const aliasA = this.getPlayerBy("id", p1ID)?.alias as string;
		const aliasB = this.getPlayerBy("id", p2ID)?.alias as string;
		this.db.prepare(`INSERT INTO matches (
			id, tournament_id, player_a_id, player_b_id,
			alias_a, alias_b, score_a, score_b,
			state, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).run(matchId, tournamentId, p1ID, p2ID, aliasA, aliasB, scoreA, scoreB, status, Date.now());
		return matchId;
		
	}


	/**
	 * @brief Deletes a tournament and all associated data
	 * @param tournamentId Optional tournament UUID
	 * @param tournamentName Optional tournament name
	 * @throws {DatabaseError} If neither parameter is provided or tournament doesn't exist
	 */
	public deleteTournament(tournamentId?: string, tournamentName?: string)
	{
		if (!tournamentId && !tournamentName)
			throw new DatabaseError("deleteTournament: at least one of tournamentId or tournamentName is needed");
		
		if (tournamentId)
		{
			this.db.prepare("DELETE FROM matches WHERE tournament_id = ?").run(tournamentId);
    	    this.db.prepare("DELETE FROM tournament_players WHERE tournament_id = ?").run(tournamentId);
    	    this.db.prepare("DELETE FROM tournaments WHERE id = ?").run(tournamentId);
			return ;
		}
		if (tournamentName)
		{
			const tournament = this.getTournament(undefined, tournamentName);
		 	if (!tournament)
				throw new DatabaseError(`deleteTournament: tournament ${tournamentName} doesn't exist`);

			this.db.prepare("DELETE FROM matches WHERE tournament_id = ?").run(tournament.id);
			this.db.prepare("DELETE FROM tournament_players WHERE tournament_id = ?").run(tournament.id);
			this.db.prepare("DELETE FROM tournaments WHERE id = ?").run(tournament.id);

		}
	}


	/**
	 * @brief Records a game result in match history for a player
	 * @param playerAlias Player's alias
	 * @param gameType Type of game ('1v1' or 'battle_royale')
	 * @param opponentInfo Opponent name for 1v1, or comma-separated list for BR
	 * @param playerCount Number of human players in the game
	 * @param scoreFor Player's score (lives remaining or position)
	 * @param scoreAgainst Opponent's score for 1v1
	 * @param position Final position among human players (1 for winner)
	 * @param result 'win' or 'loss'
	 * @param tournamentId Optional tournament ID if part of a tournament
	 * @param botCount Number of bots in the game (for battle_royale)
	 * @param positionWithBots Final position among all players including bots
	 * @returns Generated match history entry ID
	 */
	public recordGameResult(
		playerAlias: string,
		gameType: '1v1' | 'battle_royale',
		opponentInfo: string,
		playerCount: number,
		scoreFor: number,
		scoreAgainst: number,
		position: number,
		result: 'win' | 'loss',
		tournamentId?: string,
		botCount: number = 0,
		positionWithBots?: number
	): string
	{
		const player = this.getPlayer(playerAlias);
		if (!player)
			throw new DatabaseError(`recordGameResult: player ${playerAlias} not found`);

		const id = randomUUID();
		this.db.prepare(`
			INSERT INTO match_history (
				id, player_id, player_alias, game_type, opponent_info,
				player_count, bot_count, score_for, score_against, position, position_with_bots, result,
				tournament_id, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(
			id, player.id, playerAlias, gameType, opponentInfo,
			playerCount, botCount, scoreFor, scoreAgainst, position, positionWithBots || position, result,
			tournamentId || null, Date.now()
		);
		return id;
	}

	/**
	 * @brief Records a tournament final result for a player
	 * @param playerAlias Player's alias
	 * @param tournamentId Tournament UUID
	 * @param tournamentName Tournament name
	 * @param position Final position in tournament (1 = winner)
	 * @param totalParticipants Total number of participants
	 * @param matchesWon Number of matches won
	 * @param matchesLost Number of matches lost
	 * @returns Generated tournament result entry ID
	 */
	public recordTournamentResult(
		playerAlias: string,
		tournamentId: string,
		tournamentName: string,
		position: number,
		totalParticipants: number,
		matchesWon: number,
		matchesLost: number
	): string
	{
		const player = this.getPlayer(playerAlias);
		if (!player)
			throw new DatabaseError(`recordTournamentResult: player ${playerAlias} not found`);

		const id = randomUUID();
		this.db.prepare(`
			INSERT INTO tournament_results (
				id, player_id, player_alias, tournament_id, tournament_name,
				position, total_participants, matches_won, matches_lost, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`).run(
			id, player.id, playerAlias, tournamentId, tournamentName,
			position, totalParticipants, matchesWon, matchesLost, Date.now()
		);
		return id;
	}

	/**
	 * @brief Retrieves match history for a player
	 * @param playerAlias Player's alias
	 * @param limit Maximum number of entries to return (default 50)
	 * @returns Array of match history entries ordered by date desc
	 */
	public getPlayerMatchHistory(playerAlias: string, limit: number = 50): any[]
	{
		return this.db.prepare(`
			SELECT * FROM match_history
			WHERE player_alias = ?
			ORDER BY created_at DESC
			LIMIT ?
		`).all(playerAlias, limit);
	}

	/**
	 * @brief Retrieves tournament results for a player
	 * @param playerAlias Player's alias
	 * @param limit Maximum number of entries to return (default 20)
	 * @returns Array of tournament results ordered by date desc
	 */
	public getPlayerTournamentResults(playerAlias: string, limit: number = 20): any[]
	{
		return this.db.prepare(`
			SELECT * FROM tournament_results
			WHERE player_alias = ?
			ORDER BY created_at DESC
			LIMIT ?
		`).all(playerAlias, limit);
	}

	/**
	 * @brief Retrieves aggregated stats for a player
	 * @param playerAlias Player's alias
	 * @returns Object with total games, wins, losses, win rate
	 */
	public getPlayerStats(playerAlias: string): {
		totalGames: number;
		wins: number;
		losses: number;
		winRate: number;
		tournamentsPlayed: number;
		tournamentsWon: number;
	}
	{
		const matchStats = this.db.prepare(`
			SELECT 
				COUNT(*) as totalGames,
				SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
				SUM(CASE WHEN result = 'loss' THEN 1 ELSE 0 END) as losses
			FROM match_history
			WHERE player_alias = ?
		`).get(playerAlias) as { totalGames: number; wins: number; losses: number };

		const tournamentStats = this.db.prepare(`
			SELECT 
				COUNT(*) as tournamentsPlayed,
				SUM(CASE WHEN position = 1 THEN 1 ELSE 0 END) as tournamentsWon
			FROM tournament_results
			WHERE player_alias = ?
		`).get(playerAlias) as { tournamentsPlayed: number; tournamentsWon: number };

		const totalGames = matchStats?.totalGames || 0;
		const wins = matchStats?.wins || 0;
		const losses = matchStats?.losses || 0;

		return {
			totalGames,
			wins,
			losses,
			winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
			tournamentsPlayed: tournamentStats?.tournamentsPlayed || 0,
			tournamentsWon: tournamentStats?.tournamentsWon || 0
		};
	}
}




