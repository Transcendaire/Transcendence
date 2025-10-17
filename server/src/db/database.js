"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
var better_sqlite3_1 = require("better-sqlite3");
var crypto_1 = require("crypto");
// import { create } from "domain";
//ToDo use a rest api to broadcast info to players of  a tournament based on events (end of game, tournament...)
//! If tournament is launched a dn the number of players is even, fill the remaining with ai opponents
//? Use status variable of players table if a player is AI or creating another variable 
//ToDo loadFromDatabase() to retrieve tournament when server restarts
//ToDo savreBracketToDatabase() to store each match with initial state
//ToDo updateMAtchInDatabase() after the match
//ToDo check that the bracket's tournament doesnt already exists in the database before creating a bracket
/**
 * @brief Validates alias format and constraints
 * @param alias The alias string to validate
 * @throws Error if alias is invalid
 */
function checkAliasValidity(alias) {
    if (!alias || alias.trim().length < 3)
        throw new Error("Alias cannot be less than 3 characters");
    if (alias.length > 20)
        throw new Error("Alias too long (max 20 characters");
    if (!/^[a-zA-Z0-9_-]+$/.test(alias))
        throw new Error("Alias contains at least one invalid character");
}
var DatabaseService = /** @class */ (function () {
    function DatabaseService() {
        this.db = new better_sqlite3_1.default('transcendaire.db');
        this.setDatabase();
    }
    /**
     * @brief Initializes the database schema by creating the  necessary tables if they do not exist.
     *
     * This method sets up tables for players, tournaments, and matches, including their relationships and constraints.
     */
    DatabaseService.prototype.setDatabase = function () {
        this.db.exec("CREATE TABLE IF NOT EXISTS players (\n\t\t\tid TEXT PRIMARY KEY,\n\t\t\talias TEXT UNIQUE NOT NULL,\n\t\t\tcreated_at INTEGER NOT NULL,\n\t\t\tstatus TEXT NOT NULL\n\t\t\t);\n\t\t\tCREATE TABLE IF NOT EXISTS tournaments (\n\t\t\t  id TEXT PRIMARY KEY,\n\t\t\t  name TEXT NOT NULL,\n\t\t\t  curr_nb_players INTEGER NOT NULL,\n\t\t\t  max_players INTEGER NOT NULL,\n\t\t\t  status TEXT NOT NULL,\n\t\t\t  created_at INTEGER NOT NULL\n\t\t\t);\n\t\t\tCREATE TABLE IF NOT EXISTS tournament_players (\n\t\t\ttournament_id TEXT NOT NULL,\n\t\t\tplayer_id TEXT NOT NULL,\n\t\t\talias TEXT NOT NULL,\n\t\t\tjoined_at INTEGER NOT NULL,\n\t\t\tPRIMARY KEY (tournament_id, player_id),\n\t\t\tFOREIGN KEY(tournament_id) REFERENCES tournaments(id),\n\t\t\tFOREIGN KEY(player_id) REFERENCES players(id)\n\t\t\t);\n\t\t\tCREATE TABLE IF NOT EXISTS matches (\n\t\t\t  id TEXT PRIMARY KEY,\n\t\t\t  tournament_id TEXT NOT NULL,\n\t\t\t  player_a_id TEXT NOT NULL,\n\t\t\t  player_b_id TEXT NOT NULL,\n\t\t\t  alias_a TEXT NOT NULL,\n\t\t\t  alias_b TEXT NOT NULL,\n\t\t\t  score_a INTEGER DEFAULT 0,\n\t\t\t  score_b INTEGER DEFAULT 0,\n\t\t\t  state TEXT NOT NULL,\n\t\t\t  created_at INTEGER NOT NULL,\n\t\t\t  FOREIGN KEY(tournament_id) REFERENCES tournaments(id),\n\t\t\t  FOREIGN KEY(player_a_id) REFERENCES players(id),\n\t\t\t  FOREIGN KEY(player_b_id) REFERENCES players(id)\n\t\t\t);\n\t\t");
    };
    /**
     * @brief Creates a new player in the database
     * @param alias Unique player alias
     * @returns Generated UUID for the created player
     * @throws Error if alias is invalid or already exists
     */
    DatabaseService.prototype.createPlayer = function (alias) {
        checkAliasValidity(alias);
        if (this.db.getPlayerBy("alias", alias))
            throw new Error("Alias already taken, please chose a new one."); //? Should throw
        var id = (0, crypto_1.randomUUID)();
        this.db.prepare("INSERT INTO players (id, alias, created_at, status) VALUES (?, ?, ?, ?)").run(id, alias.trim(), Date.now(), 'created');
        return id;
    };
    /**
     * @brief Retrieves a player by their alias
     * @param alias The player's alias to search for
     * @returns Player object if found, undefined otherwise
     */
    DatabaseService.prototype.getPlayer = function (alias) {
        return this.db.prepare("SELECT * FROM players WHERE alias= ?").get(alias);
    };
    /**
     * @brief Checks if a player with a given alias exists
     * @param alias The alias to check
     * @returns True if player exists, false otherwise
     */
    DatabaseService.prototype.playerExists = function (alias) {
        if (!alias)
            return false;
        return (this.db.prepare("SELECT 1 FROM players WHERE alias= ?").get(alias)) !== undefined;
    };
    /**
     * @brief Updates a player's alias
     * @param id Player's UUID
     * @param newAlias New alias to set
     * @returns True if update successful, false otherwise
     * @throws Error if player not found, alias invalid, or alias already taken
     */
    DatabaseService.prototype.updatePlayerAlias = function (id, newAlias) {
        var existingPlayer = this.db.prepare("SELECT id FROM players WHERE alias = ?").get(newAlias.trim());
        var result = this.db.prepare("UPDATE players SET alias = ? WHERE id = ?").run(newAlias.trim(), id);
        if (!newAlias || newAlias.trim().length < 3)
            throw new Error("New alias cannot be less than 3 characters");
        checkAliasValidity(newAlias);
        if (!this.db.prepare("SELECT 1 FROM players WHERE id = ?").get(id))
            throw new Error("Player not found");
        if (existingPlayer && existingPlayer.id !== id)
            throw new Error("Alias already taken by another player");
        return result.changes > 0;
    };
    /**
     * @brief Gets total number of players in database
     * @returns Count of players
     */
    DatabaseService.prototype.getPlayerCount = function () {
        var result = this.db.prepare("SELECT COUNT(*) as count FROM players").get();
        return result.count;
    };
    /**
     * @brief Retrieves a player by specified column and value in the players table
     * @param type Column name to search by
     * @param value Value to search for
     * @returns Player object if found, undefined otherwise
     * @throws Error if invalid search type
     */
    DatabaseService.prototype.getPlayerBy = function (type, value) {
        var columnMap = {
            "id": "SELECT * FROM players WHERE id= ?",
            "alias": "SELECT * FROM players WHERE alias= ?",
            "created_at": "SELECT * FROM players WHERE created_at= ?",
            "all": "SELECT * FROM players"
        };
        var query = columnMap[type];
        if (!query)
            throw new Error("Invalid data request in ".concat(type));
        return this.db.prepare(query).get(value);
    };
    //*run for insert/update/delete queries
    //*all for select query
    /**
     * @brief Removes a player from the database
     * @param id Player's UUID to remove
     * @returns True if deletion successful, false if player not found
     * @throws Error if ID is invalid
     */
    DatabaseService.prototype.removePlayer = function (id) {
        if (!id || id.trim().length < 3)
            throw new Error("Player ID cannot be less than 3 characters");
        var result = this.db.prepare("DELETE FROM players WHERE id= ?").run(id);
        return result.changes > 0;
    };
    /**
     * @brief Retrieves all players from database
     * @returns Array of all player objects
     */
    DatabaseService.prototype.getAllPlayers = function () {
        return this.db.prepare("SELECT * FROM players").all();
    };
    /**
     * @brief Gets specific column data from all players
     * @param type Column name to retrieve
     * @returns Array of column values or full player objects
     * @throws Error if invalid column type
     */
    DatabaseService.prototype.getColumnsBy = function (type) {
        var columnMap = {
            "id": "SELECT id FROM players",
            "alias": "SELECT alias FROM players",
            "created_at": "SELECT created_at FROM players",
            "all": "SELECT * FROM players"
        };
        var query = columnMap[type];
        if (!query)
            throw new Error("Invalid data request in ".concat(type)); //? Is this check really necessary with user-defined type
        return this.db.prepare(query).all();
    };
    /**
    * @brief Print all players to console (development only)
    */
    DatabaseService.prototype.printPlayers = function () {
        var dbPlayers = this.db.prepare("SELECT * FROM players").all();
        dbPlayers.forEach(function (p) { return console.log("player :", p); });
    };
    DatabaseService.prototype.getMatches = function (tournamentId, matchId) {
        if (!tournamentId && !matchId)
            throw new Error("getMatchById: at least one of tournamentId or matchId is needed");
        var query = "SELECT * FROM matches WHERE ";
        if (tournamentId) {
            query += "tournament_id = ?";
            return this.db.prepare(query).all(tournamentId);
        }
        if (matchId) {
            query += "id = ?";
            return this.db.prepare(query).all(matchId);
        }
        return;
    };
    DatabaseService.prototype.deleteAll = function () {
        this.db.prepare("DELETE FROM players").run();
        this.db.prepare("DELETE FROM tournament_players").run();
        this.db.prepare("DELETE FROM tournaments").run();
        this.db.prepare("DELETE FROM matches").run();
    };
    DatabaseService.prototype.getNameById = function (id, table) {
        var query = "";
        switch (table) {
            case "players":
                query = "SELECT alias FROM players WHERE id = ?";
                break;
            case "tournaments":
                query = "SELECT name FROM tournaments WHERE id = ?";
                break;
            case "tournament_players":
                query = "SELECT alias FROM tournament_players WHERE id = ?";
                break;
            case "matches":
                query = "SELECT alias_a, alias_b FROM matches WHERE id = ?";
        }
        return this.db.prepare(query).get(id);
    };
    //* TOURNAMENT FUNCTIONS
    /**
     * @brief Retrieves a tournament by ID or name
     * @param id Optional tournament UUID to search by
     * @param name Optional tournament name to search by
     * @returns Tournament object if found, undefined otherwise
     * @throws Error if neither id nor name is provided
     */
    DatabaseService.prototype.getTournament = function (id, name) {
        if (!id && !name)
            throw new Error("getTournament: at least one of id or name is needed");
        var query = "SELECT * FROM tournaments WHERE";
        if (id) {
            query += " id= ?";
            return this.db.prepare(query).get(id);
        }
        if (name) {
            query += " name= ?";
            return this.db.prepare(query).get(name);
        }
    };
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
    DatabaseService.prototype.getTournamentsByStatus = function (status) {
        return this.db.prepare("SELECT * FROM tournaments WHERE status = ?").all(status);
    };
    DatabaseService.prototype.getTournamentPlayers = function (tournamentId) {
        if (!tournamentId)
            throw new Error("getTournamentPlayers: tournament ID cannot be empty");
        return this.db.prepare("SELECT * FROM tournament_players WHERE tournament_id = ?").all(tournamentId);
    };
    //ToDo add a filler if players are even (with AI players);
    /**
     * @brief Creates a new tournament in the database
     * @param name Unique name for the tournament
     * @param maxPlayers Maximum number of players allowed in the tournament
     * @returns Generated UUID for the created tournament
     * @throws Error if tournament name already exists or database operation fails
     */
    DatabaseService.prototype.createTournament = function (name, maxPlayers) {
        if (this.getTournament(undefined, name))
            throw new Error("createTournament: tournament ".concat(name, " already exists and cannot be created"));
        if (maxPlayers % 2)
            throw new Error("createTournament: Number of players inside a tournament must be even");
        if (maxPlayers < 2 || maxPlayers > 64)
            throw new Error("createTournament: Number of players inside a tournament must be between 2 and 64");
        var id = (0, crypto_1.randomUUID)();
        this.db.prepare("INSERT INTO tournaments (id, name, curr_nb_players, max_players, status, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(id, name, 0, maxPlayers, 'created', Date.now());
        return id;
    };
    /**
     * @brief Adds a player to a tournament, creating the player if they don't exist
     * @param alias Player's alias to add to the tournament
     * @param tournamentId UUID of the tournament to join
     * @param tournamentName Name of the tournament (used for error messages)
     * @throws Error if alias is invalid, tournament doesn't exist, tournament is full, or player is already registered
     */
    DatabaseService.prototype.addPlayerToTournament = function (alias, tournamentId, tournamentName) {
        checkAliasValidity(alias);
        var tournament = this.getTournament(tournamentId);
        if (!tournament)
            throw new Error("addPlayerToTournament: Tournament ".concat(tournamentName, " not found"));
        if (tournament.curr_nb_players === tournament.max_players)
            throw new Error("addPlayerToTournament: cannot add ".concat(alias, ": Tournament ").concat(tournamentName, " is already full"));
        var player = this.getPlayer(alias);
        if (!player) {
            var playerId = this.createPlayer(alias);
            player = { id: playerId, alias: alias, createdAt: Date.now() };
        }
        var playerAlreadyInTournament = this.db.prepare("SELECT 1 FROM tournament_players WHERE tournament_id = ? AND player_id = ?").get(tournamentId, player.id);
        if (playerAlreadyInTournament)
            throw new Error("addPlayerToTournament: player with alias ".concat(alias, " already exists in tournament ").concat(tournamentName));
        this.db.prepare("INSERT INTO tournament_players (tournament_id, player_id, alias, joined_at) VALUES (?, ?, ?, ?)").run(tournamentId, player.id, alias, Date.now());
        this.db.prepare("UPDATE tournaments SET curr_nb_players = curr_nb_players + 1 WHERE id = ?").run(tournamentId);
    };
    /**
     * @brief Updates the status of a tournament
     * @param status New status value to set
     * @param tournamentId UUID of the tournament to update
     * @throws Error if tournament not found or database operation fails
     */
    DatabaseService.prototype.setTournamentStatus = function (status, tournamentId) {
        this.db.prepare("UPDATE tournaments SET status = ? WHERE id = ?").run(status, tournamentId);
    };
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
    DatabaseService.prototype.recordMatch = function (tournamentId, tournamentName, player1ID, player2ID, scorePlayer1, scorePlayer2, status) {
        var _a, _b;
        if (!tournamentId || !player1ID || !player2ID)
            throw new Error("recordMatch: tournamentId, player1ID and player2ID needed");
        if (player1ID === player2ID)
            throw new Error("recordMatch: player1ID and player2ID cannot be the same");
        var tournament = this.getTournament(tournamentId);
        if (!tournament)
            throw new Error("recordMatch: ".concat(tournamentName, " tournament doesn't exist"));
        if (status === "completed") {
            var playerAExists = this.db.prepare("SELECT 1 FROM tournament_players WHERE tournament_id = ? AND player_id = ?").get(tournamentId, player1ID);
            var playerBExists = this.db.prepare("SELECT 1 FROM tournament_players WHERE tournament_id = ? AND player_id = ?").get(tournamentId, player2ID);
            if (!playerAExists)
                throw new Error("recordMatch: first player not found in tournament ".concat(tournamentId));
            if (!playerBExists)
                throw new Error("recordMatch: second player not found in tournament ".concat(tournamentId));
        }
        var matchId = (0, crypto_1.randomUUID)();
        var aliasA = (_a = this.db.getPlayerBy(player1ID, "id")) === null || _a === void 0 ? void 0 : _a.alias;
        var aliasB = (_b = this.db.getPlayerBy(player2ID, "id")) === null || _b === void 0 ? void 0 : _b.alias;
        this.db.prepare("INSERT INTO matches (\n\t\t\tid, tournament_id, player_a_id, player_b_id,\n\t\t\tscore_a, score_b, state, created_at\n\t\t\t) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(matchId, tournamentId, player1ID, player2ID, aliasA, aliasB, scorePlayer1, scorePlayer2, status, Date.now());
        return matchId;
    };
    DatabaseService.prototype.deleteTournament = function (tournamentId, tournamentName) {
        if (!tournamentId && !tournamentName)
            throw new Error("deleteTournament: at least one of tournamentId or tournamentName is needed");
        if (tournamentId) {
            this.db.prepare("DELETE FROM matches WHERE tournament_id = ?").run(tournamentId);
            this.db.prepare("DELETE FROM tournament_players WHERE tournament_id = ?").run(tournamentId);
            this.db.prepare("DELETE FROM tournaments WHERE id = ?").run(tournamentId);
            return;
        }
        if (tournamentName) {
            var tournament = this.getTournament(undefined, tournamentName);
            if (!tournament)
                throw new Error("deleteTournament: tournament ".concat(tournamentName, " doesn't exist"));
            this.db.prepare("DELETE FROM matches WHERE tournament_id = ?").run(tournament.id);
            this.db.prepare("DELETE FROM tournament_players WHERE tournament_id = ?").run(tournament.id);
            this.db.prepare("DELETE FROM tournaments WHERE id = ?").run(tournament.id);
        }
    };
    return DatabaseService;
}());
exports.DatabaseService = DatabaseService;
//* get() returns first row. all() returns all rows. run() executes without returning data
//! should be careful when re running the program multiple time : databse already exists and some operations need to be done only once?
