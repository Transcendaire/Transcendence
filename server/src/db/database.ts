import Database from "better-sqlite3"
import { randomUUID } from "crypto"
import { Player } from "../types.js"

const db = new Database("transcendaire.db")

db.exec(
	`CREATE TABLE IF NOT EXISTS players (
	id TEXT PRIMARY KEY,
	alias TEXT UNIQUE NOT NULL,
	created_at INTEGER NOT NULL
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

/**
 * Validates alias format and constraints
 * @param alias - The alias string to validate
 * @throws Error if alias is invalid (empty, too long, or contains invalid characters)
 */
function checkAliasValidity(alias: string): void {
	if (!alias || alias.trim().length < 3)
		throw new Error("Alias cannot be less than 3 characters");
	if (alias.length > 20)
		throw new Error("Alias too long (max 20 characters");
	if (!/^[a-zA-Z0-9_-]+$/.test(alias))
		throw new Error("Alias contains at least one invalid character");
}

//*PRINT

/**
 * Creates a new player in the database
 * @param alias - Unique player alias (3-20 characters, alphanumeric + underscore/dash)
 * @returns Generated UUID for the created player
 * @throws Error if alias is invalid or already exists
 */
export function createPlayer(alias: string): string 
{
	const id = randomUUID();

	checkAliasValidity(alias);
	db.prepare("INSERT INTO players (id, alias, created_at) VALUES (?, ?, ?)").run(id, alias.trim(), Date.now());
	return id;
}


/**
 * Retrieves a player by their alias
 * @param alias - The player's alias to search for
 * @returns Player object if found, undefined otherwise
 */
export function getPlayer(alias: string): (Player | undefined) {
	return db.prepare("SELECT * FROM players WHERE alias= ?").get(alias) as (Player | undefined);
}

/**
 * Checks if a player with given alias exists
 * @param alias - The alias to check
 * @returns True if player exists, false otherwise
 */
export function playerExists(alias: string): boolean {
	if (!alias)
		return false;
	return (db.prepare("SELECT 1 FROM players WHERE alias= ?").get(alias)) !== undefined
}

/**
 * Updates a player's alias
 * @param id - Player's UUID
 * @param newAlias - New alias to set (must be unique and valid)
 * @returns True if update successful, false otherwise
 * @throws Error if player not found, alias invalid, or alias already taken
 */
export function updatePlayerAlias(id: string, newAlias: string): boolean 
{
	const existingPlayer = db.prepare("SELECT id FROM players WHERE alias = ?").get(newAlias.trim()) as { id: string } | undefined;
	const result = db.prepare("UPDATE players SET alias = ? WHERE id = ?").run(newAlias.trim(), id);

	if (!newAlias || newAlias.trim().length < 3)
		throw new Error("New alias cannot be less than 3 characters");
	checkAliasValidity(newAlias);
	if (!db.prepare("SELECT 1 FROM players WHERE id = ?").get(id))
		throw new Error("Player not found");
	if (existingPlayer && existingPlayer.id !== id) 
		throw new Error("Alias already taken by another player");
	return result.changes > 0;
}

/**
 * Gets total number of players in database
 * @returns Count of players
 */
export function getPlayerCount(): number {

	const result = db.prepare("SELECT COUNT(*) as count FROM players").get() as { count: number };
	return result.count;
}

/**
 * Retrieves a player by specified column and value
 * @param type - Column name to search by ("id", "alias", "created_at")
 * @param value - Value to search for
 * @returns Player object if found, undefined otherwise
 * @throws Error if invalid search type
 */
export function getPlayerBy(type: string, value: string): (Player | undefined) 
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
	return db.prepare(query).get(value) as (Player | undefined);
}

//*run for insert/update/delete queries
//*all for select query

/**
 * Removes a player from the database
 * @param id - Player's UUID to remove
 * @returns True if deletion successful, false if player not found
 * @throws Error if ID is invalid
 */
export function removePlayer(id: string): boolean {

	if (!id || id.trim().length < 3)
			throw new Error("Player ID cannot be less than 3 characters");
	const result = db.prepare("DELETE FROM players WHERE id= ?").run(id);
	return result.changes > 0;
}

/**
 * Retrieves all players from database
 * @returns Array of all player objects
 */
export function listAllPlayers(): Player[] {
	return db.prepare("SELECT * FROM players").all() as Player[];
}

/**
 * Gets specific column data from all players
 * @param type - Column name ("id", "alias", "created_at", "all")
 * @returns Array of column values or full player objects
 * @throws Error if invalid column type
 */
export function getColumnsBy(type: string): any[] 
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
	return db.prepare(query).all();
}

//*for dev
function	printPlayers(): void {
	const dbPlayers = db.prepare("SELECT * FROM players").all() as Player[]; //*all allows to get ALL ROWS from the query result
	dbPlayers.forEach((p: Player) =>  console.log("player :", p));
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////!
createPlayer("SONER")
createPlayer("PIERRE")
createPlayer("PAUL")

const players: Player[] = [];
const dbPlayers = [getPlayer("SONER"), getPlayer("PIERRE"), getPlayer("PAUL")];

dbPlayers.forEach(currentElement => {
    if (currentElement) {
        players.push({
            id: currentElement.id,
            alias: currentElement.alias,
			created_at: currentElement.created_at
        });
    }
});
for (let i = 0; i < 3; i++)
{
	if (players[i])
			console.log("Players: ", players[i])
}

if (players[0])
	removePlayer(players[0].id);
console.log("\t\t\t\t\t REMOVED ONE \t\t\t\t")

printPlayers();

let arr: any[] = [];
try {
	arr = getColumnsBy("id");
} catch(e) {
	console.error(e);
}
arr.forEach(p => console.log(p));