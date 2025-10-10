import { match } from "assert";
import { getDatabase } from "../db/databaseSingleton.js";
import { SingleEliminationBracket } from "./brackets.js";
import { Match } from "./brackets.js"
import chalk from "chalk";

const brackets = new SingleEliminationBracket();


function checkWinner(matches: Match[][])
{
	let maxRound = matches.length;
	for (let i = 0; i < maxRound; i++)
	{
		for (let j = 0; j < matches[i]!.length ; j++)
		{
			let winnerAlias = matches[i]![j]!.winnerAlias;
			let winnerId = matches[i]![j]!.winnerId;

			if (winnerAlias === matches[i]![j]!.player1Alias)
			{
				console.log("round ", chalk.grey(i), " match ", chalk.grey(j))
				if (winnerId === matches[i]![j]!.player1Id)
					console.log(chalk.green("OK"))
				else 
					console.log(chalk.red("KO"));
				console.log(
				"winnerId: " + winnerId + "\n" +
				"player1Id: " + matches[i]![j]!.player1Id + "\n" +
				"winnerAlias: " + winnerAlias + "\n" +
				"player1Alias: " + matches[i]![j]!.player1Alias
				);
			}
			if (winnerAlias === matches[i]![j]!.player2Alias)
			{
				console.log("round ", chalk.grey(i), " match ", chalk.grey(j))
				if (winnerId === matches[i]![j]!.player2Id)
					console.log(chalk.green("OK"))
				else 
					console.log(chalk.red("KO"));
				console.log(
					"winnerId: " + winnerId + "\n" +
					"player2Id: " + matches[i]![j]!.player2Id + "\n" +
					"winnerAlias: " + winnerAlias + "\n" +
					"player2Alias: " + matches[i]![j]!.player2Alias
				);
			}
		}
	}
	
}


const db = getDatabase();
let tournamentId = db.createTournament("les R",14);

db.addPlayerToTournament("aaa", tournamentId, "les R");
db.addPlayerToTournament("bbb", tournamentId, "les R");
db.addPlayerToTournament("ccc", tournamentId, "les R");
db.addPlayerToTournament("ddd", tournamentId, "les R");
db.addPlayerToTournament("eee", tournamentId, "les R");
db.addPlayerToTournament("fff", tournamentId, "les R");
db.addPlayerToTournament("ggg", tournamentId, "les R");
db.addPlayerToTournament("hhh", tournamentId, "les R");
// db.addPlayerToTournament("iii", tournamentId, "les R");
// db.addPlayerToTournament("jjj", tournamentId, "les R");
// db.addPlayerToTournament("kkk", tournamentId, "les R");
// db.addPlayerToTournament("lll", tournamentId, "les R");

let matches: Match[][] = brackets.generateBracket(tournamentId, "les R");

console.log("length of matches ", matches.length);


console.log("matches : ", matches);
// console.log(matches[0]);
if (matches[0] && matches[0][0])
		console.log(matches[0][0].round, matches[0][0].status)

for (let i = 0; i < (matches[0]?.length ?? 0); i++)
{
	let random = Math.random() % 2;
	let matchWinner: string | undefined;
	if (matches[0]?.[i]) {
		matchWinner = random ? matches[0][i]?.player1Id : matches[0][1]?.player2Id;
	}
	brackets.updateMatchResult(matches, 0, i, matchWinner as string);
}

brackets.updateBracket(matches, 0);
console.log("\t\t\t UPDATED MATCHES\n", matches);

checkWinner(matches);