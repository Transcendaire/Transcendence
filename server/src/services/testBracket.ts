import { getDatabase } from "../db/databaseSingleton.js";
import { SingleEliminationBracket } from "./brackets.js";
import { Match } from "./brackets.js"

const brackets = new SingleEliminationBracket();


const db = getDatabase();
let tournamentId = db.createTournament("les R",12);

db.addPlayerToTournament("aaa", tournamentId, "les R");
db.addPlayerToTournament("bbb", tournamentId, "les R");
db.addPlayerToTournament("ccc", tournamentId, "les R");
db.addPlayerToTournament("ddd", tournamentId, "les R");
db.addPlayerToTournament("eee", tournamentId, "les R");
db.addPlayerToTournament("fff", tournamentId, "les R");
db.addPlayerToTournament("ggg", tournamentId, "les R");
db.addPlayerToTournament("hhh", tournamentId, "les R");
db.addPlayerToTournament("iii", tournamentId, "les R");
db.addPlayerToTournament("jjj", tournamentId, "les R");
db.addPlayerToTournament("kkk", tournamentId, "les R");
// db.addPlayerToTournament("lll", tournamentId, "les R");

let matches: Match[][] = brackets.generateBracket(tournamentId);



// console.log("matches : ", matches);
// console.log(matches[0]);
if (matches[0] && matches[0][0])
		console.log(matches[0][0].player1Alias)