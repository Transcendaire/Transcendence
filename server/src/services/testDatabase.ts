import { DatabaseService } from "../db/database";
import { getDatabase } from "../db/databaseSingleton";

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`❌ Test failed: ${message}`);
    }
    console.log(`✅ ${message}`);
}

function assertEqual(actual: any, expected: any, message: string) {
    if (actual !== expected) {
        throw new Error(`❌ Test failed: ${message}\n   Expected: ${expected}\n   Got: ${actual}`);
    }
    console.log(`✅ ${message}`);
}

// ========== PLAYER TESTS ==========

function testCreatePlayer() {
    const db = getDatabase();
    db.deleteAll();
    
    const id = db.createPlayer("testuser");
    assert(typeof id === "string", "createPlayer returns string id");
    
    const player = db.getPlayer("testuser");
    assert(player !== undefined, "player exists after creation");
    assertEqual(player!.alias, "testuser", "player has correct alias");
    
    // Test invalid aliases
    try {
        db.createPlayer("ab"); // Too short
        assert(false, "should throw for short alias");
    } catch (e) {
        assert(true, "throws error for alias < 3 characters");
    }
    
    try {
        db.createPlayer("testuser"); // Duplicate
        assert(false, "should throw for duplicate alias");
    } catch (e) {
        assert(true, "throws error for duplicate alias");
    }
    
    try {
        db.createPlayer("test user"); // Invalid characters
        assert(false, "should throw for invalid characters");
    } catch (e) {
        assert(true, "throws error for invalid characters in alias");
    }
}

function testGetPlayer() {
	const db = getDatabase()
    db.deleteAll();
    
    assert(db.getPlayer("nope") === undefined, "getPlayer returns undefined for non-existent");
    
    db.createPlayer("exists");
    const player = db.getPlayer("exists");
    assert(player !== undefined, "getPlayer returns player when exists");
    assertEqual(player!.alias, "exists", "getPlayer returns correct player");
}

function testPlayerExists() {
	const db = getDatabase()
    db.deleteAll();
    
    db.createPlayer("exists");
    assertEqual(db.playerExists("exists"), true, "playerExists returns true");
    assertEqual(db.playerExists("nope"), false, "playerExists returns false");
    assertEqual(db.playerExists(""), false, "playerExists handles empty string");
}

function testUpdatePlayerAlias() {
	const db = getDatabase()
    db.deleteAll();
    
    const id = db.createPlayer("oldname");
    const result = db.updatePlayerAlias(id, "newname");
    assertEqual(result, true, "updatePlayerAlias returns true on success");
    assert(db.getPlayer("newname") !== undefined, "player found with new alias");
    assert(db.getPlayer("oldname") === undefined, "player not found with old alias");
    
    // Test invalid updates
    try {
        db.updatePlayerAlias(id, "ab"); // Too short
        assert(false, "should throw for short alias");
    } catch (e) {
        assert(true, "throws error for alias < 3 characters");
    }
    
    const id2 = db.createPlayer("another");
    try {
        db.updatePlayerAlias(id2, "newname"); // Already taken
        assert(false, "should throw for duplicate alias");
    } catch (e) {
        assert(true, "throws error when alias already taken");
    }
}

function testGetPlayerCount() {
	const db = getDatabase()
    db.deleteAll();
    
    assertEqual(db.getPlayerCount(), 0, "count is 0 initially");
    
    db.createPlayer("player1");
    db.createPlayer("player2");
    assertEqual(db.getPlayerCount(), 2, "count is correct after additions");
}

function testGetPlayerBy() {
	const db = getDatabase()
    db.deleteAll();
    
    const id = db.createPlayer("findme");
    
    const byId = db.getPlayerBy("id", id);
    assert(byId !== undefined, "getPlayerBy finds by id");
    assertEqual(byId!.alias, "findme", "getPlayerBy returns correct player by id");
    
    const byAlias = db.getPlayerBy("alias", "findme");
    assert(byAlias !== undefined, "getPlayerBy finds by alias");
    assertEqual(byAlias!.id, id, "getPlayerBy returns correct player by alias");
    
    try {
        db.getPlayerBy("invalid", "value");
        assert(false, "should throw for invalid type");
    } catch (e) {
        assert(true, "throws error for invalid search type");
    }
}

function testRemovePlayer() {
	const db = getDatabase()
    db.deleteAll();
    
    const id = db.createPlayer("toremove");
    assertEqual(db.removePlayer(id), true, "removePlayer returns true");
    assert(db.getPlayer("toremove") === undefined, "player removed successfully");
    
    assertEqual(db.removePlayer("nonexistent"), false, "removePlayer returns false for non-existent");
}

function testGetAllPlayers() {
	const db = getDatabase()
    db.deleteAll();
    
    assertEqual(db.getAllPlayers().length, 0, "getAllPlayers returns empty array initially");
    
    db.createPlayer("player1");
    db.createPlayer("player2");
    const players = db.getAllPlayers();
    assertEqual(players.length, 2, "getAllPlayers returns correct count");
}

function testGetColumnsBy() {
	const db = getDatabase()
    db.deleteAll();
    
    db.createPlayer("coltest");
    const aliases = db.getColumnsBy("alias");
    assertEqual(aliases.length, 1, "getColumnsBy returns correct count");
    assertEqual(aliases[0].alias, "coltest", "getColumnsBy returns correct data");
    
    try {
        db.getColumnsBy("invalid" as any);
        assert(false, "should throw for invalid column");
    } catch (e) {
        assert(true, "throws error for invalid column type");
    }
}

// ========== TOURNAMENT TESTS ==========

function testCreateTournament() {
	const db = getDatabase()
    db.deleteAll();
    
    const tid = db.createTournament("TestTournament", 4);
    assert(typeof tid === "string", "createTournament returns string id");
    assert(db.getTournament(tid) !== undefined, "tournament exists after creation");
    
    try {
        db.createTournament("TestTournament", 4); // Duplicate
        assert(false, "should throw for duplicate tournament");
    } catch (e) {
        assert(true, "throws error for duplicate tournament name");
    }
    
    try {
        db.createTournament("OddPlayers", 5); // Odd number
        assert(false, "should throw for odd player count");
    } catch (e) {
        assert(true, "throws error for odd max players");
    }
    
    try {
        db.createTournament("TooFew", 0);
        assert(false, "should throw for too few players");
    } catch (e) {
        assert(true, "throws error for max players < 2");
    }
    
    try {
        db.createTournament("TooMany", 100);
        assert(false, "should throw for too many players");
    } catch (e) {
        assert(true, "throws error for max players > 64");
    }
}

function testGetTournament() {
	const db = getDatabase()
    db.deleteAll();
    
    const tid = db.createTournament("FindMe", 4);
    
    const byId = db.getTournament(tid);
    assert(byId !== undefined, "getTournament finds by id");
    assertEqual(byId.name, "FindMe", "getTournament returns correct tournament by id");
    
    const byName = db.getTournament(undefined, "FindMe");
    assert(byName !== undefined, "getTournament finds by name");
    assertEqual(byName.id, tid, "getTournament returns correct tournament by name");
    
    try {
        db.getTournament();
        assert(false, "should throw without parameters");
    } catch (e) {
        assert(true, "throws error when no parameters provided");
    }
}

function testGetTournamentsByStatus() {
	const db = getDatabase()
    db.deleteAll();
    
    db.createTournament("T1", 4);
    db.createTournament("T2", 4);
    
    const tournaments = db.getTournamentsByStatus("created");
    assertEqual(tournaments.length, 2, "getTournamentsByStatus returns correct count");
    
    const running = db.getTournamentsByStatus("running");
    assertEqual(running.length, 0, "getTournamentsByStatus returns empty for non-matching status");
}

function testAddPlayerToTournament() {
	const db = getDatabase()
    db.deleteAll();
    
    const tid = db.createTournament("TestTournament", 4);
    db.addPlayerToTournament("player1", tid, "TestTournament");
    
    const players = db.getTournamentPlayers(tid);
    assertEqual(players.length, 1, "player added to tournament");
    assertEqual(players[0].alias, "player1", "correct player added");
    
    const tournament = db.getTournament(tid);
    assertEqual(tournament.curr_nb_players, 1, "tournament player count updated");
    
    try {
        db.addPlayerToTournament("player1", tid, "TestTournament"); // Duplicate
        assert(false, "should throw for duplicate player");
    } catch (e) {
        assert(true, "throws error when player already in tournament");
    }
    
    db.addPlayerToTournament("player2", tid, "TestTournament");
    db.addPlayerToTournament("player3", tid, "TestTournament");
    db.addPlayerToTournament("player4", tid, "TestTournament");
    
    try {
        db.addPlayerToTournament("player5", tid, "TestTournament"); // Full
        assert(false, "should throw when tournament full");
    } catch (e) {
        assert(true, "throws error when tournament is full");
    }
}

function testGetTournamentPlayers() {
	const db = getDatabase()
    db.deleteAll();
    
    const tid = db.createTournament("TestTournament", 4);
    assertEqual(db.getTournamentPlayers(tid).length, 0, "no players initially");
    
    db.addPlayerToTournament("pp1", tid, "TestTournament");
    db.addPlayerToTournament("pp2", tid, "TestTournament");
    assertEqual(db.getTournamentPlayers(tid).length, 2, "returns correct player count");
}

function testSetTournamentStatus() {
	const db = getDatabase()
    db.deleteAll();
    
    const tid = db.createTournament("TestTournament", 4);
    db.setTournamentStatus("running", tid);
    
    const tournament = db.getTournament(tid);
    assertEqual(tournament.status, "running", "tournament status updated");
    
    db.setTournamentStatus("completed", tid);
    const updated = db.getTournament(tid);
    assertEqual(updated.status, "completed", "tournament status updated again");
}

function testRecordMatch() {
	const db = getDatabase()
    db.deleteAll();
    
    const tid = db.createTournament("TestTournament", 4);
    db.addPlayerToTournament("pp1", tid, "TestTournament");
    db.addPlayerToTournament("pp2", tid, "TestTournament");
    
    const p1 = db.getPlayer("pp1")!;
    const p2 = db.getPlayer("pp2")!;
    
    const matchId = db.recordMatch(tid, "TestTournament", p1.id, p2.id, 5, 3, "completed");
    assert(typeof matchId === "string", "recordMatch returns match id");
    
    const matches = db.getMatches(tid);
    assertEqual(matches.length, 1, "match recorded in database");
    assertEqual(matches[0].score_a, 5, "correct score for player A");
    assertEqual(matches[0].score_b, 3, "correct score for player B");
    
    try {
        db.recordMatch(tid, "TestTournament", p1.id, p1.id, 0, 0, "pending");
        assert(false, "should throw for same player");
    } catch (e) {
        assert(true, "throws error when both players are the same");
    }
}

import chalk from "chalk"
function testGetMatches() {
	const db = getDatabase()
    db.deleteAll();
    
    const tid = db.createTournament("TestTournament", 4);
    db.addPlayerToTournament("pp1", tid, "TestTournament");
    db.addPlayerToTournament("pp2", tid, "TestTournament");
    
    const p1 = db.getPlayer("pp1")!;
    const p2 = db.getPlayer("pp2")!;
    
    const matchId = db.recordMatch(tid, "TestTournament", p1.id, p2.id, 0, 0, "pending");
    
    const byTournament = db.getMatches(tid);
    assertEqual(byTournament.length, 1, "getMatches finds by tournament id");
    
    const byMatch = db.getMatches(undefined, matchId);
    assertEqual(byMatch.length, 1, "getMatches finds by match id");

	assert(p1.alias === byMatch[0].alias_a, "aliases are the same");
	assert(p2.alias === byMatch[0].alias_b, "aliases are the same");

    try {
        db.getMatches();
        assert(false, "should throw without parameters");
    } catch (e) {
        assert(true, "throws error when no parameters provided");
    }
}

function testDeleteTournament() {
	const db = getDatabase()
    db.deleteAll();
    
    const tid = db.createTournament("ToDelete", 4);
    db.addPlayerToTournament("pp1", tid, "ToDelete");
    
    const p1 = db.getPlayer("pp1")!;
    db.createPlayer("pp2");
    const p2 = db.getPlayer("pp2")!;
    db.recordMatch(tid, "ToDelete", p1.id, p2.id, 0, 0, "pending");
    
    db.deleteTournament(tid);
    assert(db.getTournament(tid) === undefined, "tournament deleted by id");
    assertEqual(db.getTournamentPlayers(tid).length, 0, "tournament players deleted");
    assertEqual(db.getMatches(tid).length, 0, "tournament matches deleted");
    
    const tid2 = db.createTournament("ToDeleteByName", 4);
    db.deleteTournament(undefined, "ToDeleteByName");
    assert(db.getTournament(tid2) === undefined, "tournament deleted by name");
}

function testGetNameById() {
	const db = getDatabase()
    db.deleteAll();
    
    const playerId = db.createPlayer("testplayer");
    const result = db.getNameById(playerId, "players");
    assertEqual(result.alias, "testplayer", "getNameById returns correct alias for player");
    
    const tid = db.createTournament("TestTournament", 4);
    const tResult = db.getNameById(tid, "tournaments");
    assertEqual(tResult.name, "TestTournament", "getNameById returns correct name for tournament");
}

function testDeleteAll() {
	const db = getDatabase()
    
    db.createPlayer("pp1");
    const tid = db.createTournament("TT1", 4);
    db.addPlayerToTournament("pp1", tid, "TT1");
    
    db.deleteAll();
    
    assertEqual(db.getAllPlayers().length, 0, "all players deleted");
    assertEqual(db.getTournamentsByStatus("created").length, 0, "all tournaments deleted");
}

// ========== RUN ALL TESTS ==========

function runAllTests() {
    console.log("🧪 Running Database Tests...\n");
    
    const tests = [
        // Player tests
        { name: "Create Player", fn: testCreatePlayer },
        { name: "Get Player", fn: testGetPlayer },
        { name: "Player Exists", fn: testPlayerExists },
        { name: "Update Player Alias", fn: testUpdatePlayerAlias },
        { name: "Get Player Count", fn: testGetPlayerCount },
        { name: "Get Player By", fn: testGetPlayerBy },
        { name: "Remove Player", fn: testRemovePlayer },
        { name: "Get All Players", fn: testGetAllPlayers },
        { name: "Get Columns By", fn: testGetColumnsBy },
        
        // Tournament tests
        { name: "Create Tournament", fn: testCreateTournament },
        { name: "Get Tournament", fn: testGetTournament },
        { name: "Get Tournaments By Status", fn: testGetTournamentsByStatus },
        { name: "Add Player To Tournament", fn: testAddPlayerToTournament },
        { name: "Get Tournament Players", fn: testGetTournamentPlayers },
        { name: "Set Tournament Status", fn: testSetTournamentStatus },
        { name: "Record Match", fn: testRecordMatch },
        { name: "Get Matches", fn: testGetMatches },
        { name: "Delete Tournament", fn: testDeleteTournament },
        { name: "Get Name By Id", fn: testGetNameById },
        { name: "Delete All", fn: testDeleteAll },
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            console.log(`\n📋 Testing: ${test.name}`);
            test.fn();
            passed++;
        } catch (error) {
            console.error(`\n${error}`);
            failed++;
        }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Total: ${tests.length}`);
    
    if (failed === 0) {
        console.log("\n🎉 All tests passed!");
        process.exit(0);
    } else {
        console.log("\n💥 Some tests failed!");
        process.exit(1);
    }
}

runAllTests();