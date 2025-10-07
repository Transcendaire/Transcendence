import { getMaxListeners } from "events";
import { DatabaseService } from "./database"
import { getDatabase } from "./databaseSingleton.js";
import { resetDatabase } from "./databaseSingleton.js";
import { match } from "assert";

// resetDatabase();
const database = getDatabase();
database.deleteAll();

try {
    let s = database.createPlayer("SonAIR");
    let p = database.createPlayer("PiAIR");
    let c = database.createPlayer("16R");
    
    console.log("s:", s);
    console.log("p:", p);
    console.log("c:", c);
    
    console.log("\n🏆 Creating tournament...");
    let tournament = database.createTournament("les R", 64);
    console.log("✅ Tournament created:", tournament);
    
    console.log("\n🔍 Testing getPlayer...");
    let playerS = database.getPlayer("SonAIR");
    console.log("Found player SonAIR:", playerS);
    
    console.log("\n👥 Adding players to tournament...");
    database.addPlayerToTournament("SonAIR", tournament, "les R");
    database.addPlayerToTournament("PiAIR", tournament, "les R");
    database.addPlayerToTournament("16R", tournament, "les R");
    console.log("✅ Players added to tournament");
    

    console.log("\n🔍 Getting tournament info...");
    let tournamentInfo = database.getTournament(tournament);
    console.log("Tournament info:", tournamentInfo);
    
	database.setTournamentStatus('running', tournament);
	console.log("\n🔍 Getting tournament info...");
    tournamentInfo = database.getTournament(tournament);
    console.log("Tournament info:", tournamentInfo);

	database.recordMatchResult(tournament, "les R", s, p, 5, 2);
	database.recordMatchResult(tournament, "les R", c, s, 5, 1);
	database.recordMatchResult(tournament, "les R", p, c, 100, 0);
	let matches = database.getMatches(tournament);
	console.log("\t\t\t\t\tMATCHES\n", matches); 
	// database.printPlayers();

} catch (error) {
    console.error("❌ Test failed:", error);
}