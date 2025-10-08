import Database from "better-sqlite3"
import { randomUUID } from "crypto"
import { Player } from "../types.js"
import { getDatabase } from "./databaseSingleton.js";
// import { create } from "domain";


	//ToDo use a rest api to broadcast info to players of  a tournament based on events (end of game, tournament...)
	//! If tournament is launched a dn the number of players is even, fill the remaining with ai opponents
	//ToDo loadFromDatabase() to retrieve tournament when server restarts
	//ToDo savreBracketToDatabase() to store each match with initial state
	//ToDo updateMAtchInDatabase() after the match
	//ToDo check that the bracket's tournament doesnt already exists in the database before creating a bracket
 
/**
 * @brief Validates alias format and constraints
 * @param alias The alias string to validate
 * @throws Error if alias is invalid
 */
function checkAliasValidity(alias: string): void
{
	if (!alias || alias.trim().length < 3)
		throw new Error("Alias cannot be less than 3 characters");
	if (alias.length > 20)
		throw new Error("Alias too long (max 20 characters");
	if (!/^[a-zA-Z0-9_-]+$/.test(alias))
		throw new Error("Alias contains at least one invalid character");
}

export class DatabaseService {
	
	private db: any;

	constructor() {
		this.db = new Database('transcendaire.db');
		this.setDatabase();
	}

	/**
	 * @brief Initializes the database schema by creating the  necessary tables if they do not exist.
	 *
	 * This method sets up tables for players, tournaments, and matches, including their relationships and constraints.
	 */
	private setDatabase(): void {
		this.db.exec(
			`CREATE TABLE IF NOT EXISTS players (
			id TEXT PRIMARY KEY,
			alias TEXT UNIQUE NOT NULL,
			created_at INTEGER NOT NULL,
			status TEXT NOT NULL
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
			  player_a TEXT NOT NULL,
			  player_b TEXT NOT NULL,
			  score_a INTEGER DEFAULT 0,
			  score_b INTEGER DEFAULT 0,
			  state TEXT NOT NULL,
			  created_at INTEGER NOT NULL,
			  FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
			  FOREIGN KEY(player_a) REFERENCES players(id),
			  FOREIGN KEY(player_b) REFERENCES players(id)
			);
		`);
	}

	/**
	 * @brief Creates a new player in the database
	 * @param alias Unique player alias
	 * @returns Generated UUID for the created player
	 * @throws Error if alias is invalid or already exists
	 */
	public createPlayer(alias: string): string 
	{
		checkAliasValidity(alias);
		
		const id = randomUUID();
		this.db.prepare("INSERT INTO players (id, alias, created_at, status) VALUES (?, ?, ?, ?)").run(id, alias.trim(), Date.now(), 'created');
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
		if (!alias)
			return false;
		return (this.db.prepare("SELECT 1 FROM players WHERE alias= ?").get(alias)) !== undefined
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
			throw new Error("New alias cannot be less than 3 characters");
		checkAliasValidity(newAlias);

		if (!this.db.prepare("SELECT 1 FROM players WHERE id = ?").get(id))
			throw new Error("Player not found");
		if (existingPlayer && existingPlayer.id !== id) 
			throw new Error("Alias already taken by another player");
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
			throw new Error(`Invalid data request in ${type}`);
		return this.db.prepare(query).get(value) as (Player | undefined);
	}

	//*run for insert/update/delete queries
	//*all for select query

	/**
	 * @brief Removes a player from the database
	 * @param id Player's UUID to remove
	 * @returns True if deletion successful, false if player not found
	 * @throws Error if ID is invalid
	 */
	public removePlayer(id: string): boolean
	{
		if (!id || id.trim().length < 3)
			throw new Error("Player ID cannot be less than 3 characters");

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

	/**
	 * @brief Gets specific column data from all players
	 * @param type Column name to retrieve
	 * @returns Array of column values or full player objects
	 * @throws Error if invalid column type
	 */
	public getColumnsBy(type: string): any[] 
	{
		const columnMap: Record<string, string> = {
			"id": "SELECT id FROM players",
			"alias": "SELECT alias FROM players",
			"created_at": "SELECT created_at FROM players",
			"all": "SELECT * FROM players"
		};
		const query: string | undefined = columnMap[type];

		if (!query)
			throw new Error(`Invalid data request in ${type}`);
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



	public getMatches(tournamentId?: string, matchId?: string) 
	{
		if (!tournamentId && !matchId)
			throw new Error("getMatchById: at least one of tournamentId or matchId is needed");
		
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

	public deleteAll()
	{
		this.db.prepare("DELETE FROM players").run()
		this.db.prepare("DELETE FROM tournament_players").run()
		this.db.prepare("DELETE FROM tournaments").run()
		this.db.prepare("DELETE FROM matches").run()
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
			throw new Error("getTournament: at least one of id or name is needed")
		
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

	public getTournamentPlayers(tournamentId: string)
	{
		if (!tournamentId)
			throw new Error("getTournamentPlayers: tournament ID cannot be empty");
		return this.db.prepare("SELECT * FROM tournament_players WHERE tournament_id = ?").all(tournamentId);
	}

	/**
	 * @brief Creates a new tournament in the database
	 * @param name Unique name for the tournament
	 * @param maxPlayers Maximum number of players allowed in the tournament
	 * @returns Generated UUID for the created tournament
	 * @throws Error if tournament name already exists or database operation fails
	 */
	public createTournament(name:string, maxPlayers:number)
	{
		if (this.getTournament(undefined, name))
			throw new Error(`createTournament: tournament ${name} already exists and cannot be created`);

		if (maxPlayers % 2)
			throw new Error("createTournament: Number of players inside a tournament must be even")
		if (maxPlayers < 2 || maxPlayers > 64)
			throw new Error("createTournament: Number of players inside a tournament must be between 2 and 64")
	
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
			throw new Error(`addPlayerToTournament: Tournament ${tournamentName} not found`);
		
		if (tournament.curr_nb_players === tournament.max_players)
			throw new Error(`addPlayerToTournament: cannot add ${alias}: Tournament ${tournamentName} is already full`)

		let player = this.getPlayer(alias);
		if (!player)
		{
			const playerId = this.createPlayer(alias);
			player = { id: playerId, alias, createdAt: Date.now()};
		}

		const playerAlreadyInTournament = this.db.prepare("SELECT 1 FROM tournament_players WHERE tournament_id = ? AND player_id = ?"
		).get(tournamentId, player.id);
		if (playerAlreadyInTournament)
			throw new Error(`addPlayerToTournament: player with alias ${alias} already exists in tournament ${tournamentName}`)

		this.db.prepare("INSERT INTO tournament_players (tournament_id, player_id, alias, joined_at) VALUES (?, ?, ?, ?)"
		).run(tournamentId, player.id, alias, Date.now());

		this.db.prepare("UPDATE tournaments SET curr_nb_players = curr_nb_players + 1 WHERE id = ?").run(tournamentId);
	}

	/**
	 * @brief Updates the status of a tournament
	 * @param status New status value to set
	 * @param tournamentId UUID of the tournament to update
	 * @throws Error if tournament not found or database operation fails
	 */
	public setTournamentStatus(status: string, tournamentId: string): void 
	{
		if (status != 'created' && status != 'running' && status != 'completed')
			throw new Error("setTournamentStatus: status can only be 'created', 'running' or 'completed'");
		this.db.prepare("UPDATE tournaments SET status = ? WHERE id = ?").run(status, tournamentId);
	}

	/**
	 * @brief Records the result of a match between two players in a tournament
	 * @param tournamentId UUID of the tournament where the match took place
	 * @param tournamentName Name of the tournament (used for error messages)
	 * @param player1Id UUID of the first player
	 * @param player2ID UUID of the second player
	 * @param scorePlayer1 Score achieved by the first player
	 * @param scorePlayer2 Score achieved by the second player
	 * @throws Error if required parameters are missing, players are the same, tournament doesn't exist, or players are not registered in the tournament
	 */
	public recordMatch(tournamentId: string, tournamentName: string, player1ID: string, player2ID: string, scorePlayer1: number, scorePlayer2: number, status: string): string 
	{
		if (!tournamentId || !player1ID || !player2ID)
			throw new Error("recordMatch: tournamentId, player1ID and player2ID needed");
		
		if (player1ID === player2ID)
			throw new Error("recordMatch: player1ID and player2ID cannot be the same");

		const tournament = this.getTournament(tournamentId);
		if (!tournament)
			throw new Error(`recordMatch: ${tournamentName} tournament doesn't exist`)

		let playerAExists = this.db.prepare("SELECT 1 FROM tournament_players WHERE tournament_id = ? AND player_id = ?").get(tournamentId, player1ID);
		let playerBExists = this.db.prepare("SELECT 1 FROM tournament_players WHERE tournament_id = ? AND player_id = ?").get(tournamentId, player2ID);

    	if (!playerAExists)
      		throw new Error(`recordMatch: first player not found in tournament ${tournamentId}`);
    	if (!playerBExists)
        	throw new Error(`recordMatch: second player not found in tournament ${tournamentId}`);

		const matchId = randomUUID();
		this.db.prepare(`INSERT INTO matches (
			id, tournament_id, player_a, player_b,
			score_a, score_b, state, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			).run(matchId, tournamentId, player1ID, player2ID, scorePlayer1, scorePlayer2, status, Date.now());
		return matchId;
		
	}

	public deleteTournament(tournamentId?: string, tournamentName?: string)
	{
		if (!tournamentId && !tournamentName)
			throw new Error("deleteTournament: at least one of tournamentId or tournamentName is needed");
		
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
				throw new Error(`deleteTournament: tournament ${tournamentName} doesn't exist`);

			this.db.prepare("DELETE FROM matches WHERE tournament_id = ?").run(tournament.id);
			this.db.prepare("DELETE FROM tournament_players WHERE tournament_id = ?").run(tournament.id);
			this.db.prepare("DELETE FROM tournaments WHERE id = ?").run(tournament.id);

		}
	}
}





//* get() returns first row. all() returns all rows. run() executes without returning data
//! should be careful when re running the program multiple time : databse already exists and some operations need to be done only once?