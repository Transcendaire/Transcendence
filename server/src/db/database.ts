import Database from "better-sqlite3"
import { randomUUID } from "crypto"
import { Player } from "../types.js"


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

	constructor(public name: string) {
		this.db = new Database(name);
		this.setDatabase();
	}

	/**
	 * @brief Initializes the database schema by creating the necessary tables if they do not exist.
	 *
	 * This method sets up tables for players, tournaments, and matches, including their relationships and constraints.
	 */
	private setDatabase(): void {
		this.db.exec(
			`CREATE TABLE IF NOT EXISTS players (
			id TEXT PRIMARY KEY,
			alias TEXT UNIQUE NOT NULL,
			created_at INTEGER NOT NULL,
			situation TEXT PRIMARY KEY
			);
			CREATE TABLE IF NOT EXISTS tournaments (
			  id TEXT PRIMARY KEY,
			  name TEXT NOT NULL,
			  created_at INTEGER NOT NULL
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
		const id = randomUUID();

		checkAliasValidity(alias);
		this.db.prepare("INSERT INTO players (id, alias, created_at) VALUES (?, ?, ?)").run(id, alias.trim(), Date.now());
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
	 * @brief Checks if a player with given alias exists
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
	 * @brief Retrieves a player by specified column and value
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
		const result = this.db.prepare("DELETE FROM players WHERE id= ?").run(id);

		if (!id || id.trim().length < 3)
			throw new Error("Player ID cannot be less than 3 characters");
		return result.changes > 0;
	}

	/**
	 * @brief Retrieves all players from database
	 * @returns Array of all player objects
	 */
	public listAllPlayers(): Player[]
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
}






