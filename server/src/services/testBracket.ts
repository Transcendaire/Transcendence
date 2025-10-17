import { match } from "assert";
import { getDatabase } from "../db/databaseSingleton.js";
import { SingleEliminationBracket } from "./brackets.js";
import { Match } from "./brackets.js"
import chalk from "chalk";
import { randomInt } from "crypto";

/**
 * Generates a random alphanumeric name with specified length
 * @param length Desired name length
 * @returns Random name string
 */
function generateRandomName(): string {
const nameList = [
	'Time',    'Past',    'Future',  'Dev',     'Fly',     'Flying',
	'Soar',    'Soaring', 'Power',   'Falling', 'Fall',    'Jump',
	'Cliff',   'Mountain','Rend',    'Red',     'Blue',    'Green',
	'Yellow',  'Gold',    'Demon',   'Demonic', 'Panda',   'Cat',
	'Kitty',   'Kitten',  'Zero',    'Memory',  'Trooper', 'YYY',
	'Bandit',  'Fear',    'Light',   'Glow',    'Tread',   'Deep',
	'Deeper',  'Deepest', 'Mine',    'Your',    'Worst',   'Enemy',
	'Hostile', 'Force',   'Video',   'Game',    'Donkey',  'Mule',
	'Colt',    'Cult',    'Cultist', 'Magnum',  'Gun',     'Assault',
	'Recon',   'Trap',    'Trapper', 'Redeem',  'Code',    'Script',
	'Writer',  'Near',    'Close',   'Open',    'Cube',    'Circle',
	'Geo',     'Genome',  'Germ',    'Spaz',    'Shot',    'Echo',
	'Beta',    'Alpha',   'Gamma',   'Omega',   'Seal',    'Squid',
	'Money',   'Cash',    'Lord',    'King',    'Duke',    'Rest',
	'Fire',    'Flame',   'Morrow',  'Break',   'Breaker', 'Numb',
	'Ice',     'Cold',    'Rotten',  'Sick',    'Sickly',  'Janitor',
	'Camel',   'Rooster', 'Sand',    'Desert',  'Dessert', 'Hurdle',
	'Racer',   'Eraser',  'Erase',   'Big',     'Small',   'Short',
	'Tall',    'Sith',    'Bounty',  'Hunter',  'Cracked', 'Broken',
	'Sad',     'Happy',   'Joy',     'Joyful',  'Crimson', 'Destiny',
	'Deceit',  'Lies',    'Lie',     'Honest',  'Destined','Bloxxer',
	'Hawk',    'Eagle',   'Hawker',  'Walker',  'Zombie',  'Sarge',
	'Capt',    'Captain', 'Punch',   'One',     'Two',     'Uno',
	'Slice',   'Slash',   'Melt',    'Melted',  'Melting', 'Fell',
	'Wolf',    'Hound',   'Legacy',  'Sharp',   'Dead',    'Mew',
	'Chuckle', 'Bubba',   'Bubble',  'Sandwich','Smasher', 'Extreme',
	'Multi',   'Universe','Ultimate', 'Death',   'Ready',   'Monkey',
	'Elevator','Wrench',  'Grease',  'Head',    'Theme',   'Grand',
	'Cool',    'Kid',     'Boy',     'Girl',    'Vortex',  'Paradox'
];
    return nameList[(Math.floor(Math.random() * 174))] as string;
}

/**
 * Prints the tournament bracket in a readable format
 * @param matches The tournament bracket structure
 */
function printBracket(matches: Match[][]) {
    console.log("\n" + chalk.bold.blue("=".repeat(80)));
    console.log(chalk.bold.blue("                         TOURNAMENT BRACKET"));
    console.log(chalk.bold.blue("=".repeat(80)) + "\n");

    const maxRounds = matches.length;

    for (let round = 0; round < maxRounds; round++) {
        const roundMatches = matches[round];
        if (!roundMatches) continue;

        // Print round header
        const roundName = round === maxRounds - 1 ? "FINAL" : 
                         round === maxRounds - 2 ? "SEMI-FINALS" : 
                         round === maxRounds - 3 ? "QUARTER-FINALS" : 
                         `ROUND ${round + 1}`;
        
        console.log(chalk.bold.yellow(`\n┌─ ${roundName} ${"─".repeat(70 - roundName.length)}`));
        console.log(chalk.yellow("│"));

        // Print each match in the round
        for (let matchIdx = 0; matchIdx < roundMatches.length; matchIdx++) {
            const match = roundMatches[matchIdx];
            if (!match) continue;

            const isLastMatch = matchIdx === roundMatches.length - 1;
            const connector = isLastMatch ? "└" : "├";

            console.log(chalk.yellow(`${connector}──┬─ Match ${matchIdx + 1}`));

            // Player 1
            const p1Status = match.winnerId === match.player1Id ? chalk.green(" ✓ WINNER") : "";
            const p1Color = match.winnerId === match.player1Id ? chalk.green : chalk.white;
            const p1Alias = match.player1Alias === "TBD" ? chalk.gray("(TBD)") : p1Color(match.player1Alias);
            
            console.log(chalk.yellow(`   │`) + `  ${p1Alias}${p1Status}`);

            // VS
            console.log(chalk.yellow(`   │`) + "     vs");

            // Player 2
            const p2Status = match.winnerId === match.player2Id ? chalk.green(" ✓ WINNER") : "";
            const p2Color = match.winnerId === match.player2Id ? chalk.green : chalk.white;
            const p2Alias = match.player2Alias === "TBD" ? chalk.gray("(TBD)") : 
                           match.player2Alias === "BYE" ? chalk.gray("(BYE)") : 
                           p2Color(match.player2Alias);
            
            console.log(chalk.yellow(`   │`) + `  ${p2Alias}${p2Status}`);

            // Match status
            const statusColor = match.status === "completed" ? chalk.green : 
                               match.status === "playing" ? chalk.yellow : 
                               chalk.gray;
            console.log(chalk.yellow(`   │`) + `  ${statusColor(`[${match.status.toUpperCase()}]`)}`);
            
            if (!isLastMatch) {
                console.log(chalk.yellow("   │"));
            }
        }
        console.log(chalk.yellow("   "));
    }

    console.log(chalk.bold.blue("\n" + "=".repeat(80) + "\n"));
}

/**
 * Runs a complete tournament simulation with the specified number of players
 * @param playerCount Number of players for the tournament (2-64)
 */
function runTournamentTest(playerCount: number) {
    // Validate input
    if (playerCount < 2 || playerCount > 64) {
        console.error("Player count must be between 2 and 64");
        return;
    }

    console.log(chalk.bold.green(`\n=== STARTING TOURNAMENT WITH ${playerCount} PLAYERS ===\n`));
    
    // Set up database and tournament
    const db = getDatabase();
    const tournamentName = `Test-${Date.now()}`;
    const tournamentId = db.createTournament(tournamentName, playerCount);
    
    // Create players with random names
    const playerNames = new Set<string>();
    while (playerNames.size < playerCount) {
        // Generate random name with length between 3-10
        const name = generateRandomName();
        playerNames.add(name);
    }
    
    console.log(chalk.cyan("Created players:"));
    playerNames.forEach(name => {
        db.addPlayerToTournament(name, tournamentId, tournamentName);
        console.log(` - ${name}`);
    });
    
    // Generate bracket
    const bracketService = new SingleEliminationBracket();
    const bracket = bracketService.generateBracket(tournamentId, tournamentName);
    
    console.log(chalk.cyan(`\nGenerated bracket with ${bracket.length} rounds`));
    
    // Run all rounds of the tournament
    for (let round = 0; round < bracket.length; round++) {
        console.log(chalk.yellow(`\n--- ROUND ${round} ---`));
        const roundMatches = bracket[round];
        
        if (!roundMatches || roundMatches.length === 0) {
            console.log("No matches in this round");
            continue;
        }
        
        // Process each match in the round
        for (let matchIdx = 0; matchIdx < roundMatches.length; matchIdx++) {
            const match = roundMatches[matchIdx];
            if (!match) continue;
            
            // Skip already completed matches (could happen with byes)
            if (match.status === "completed") {
                console.log(`Match ${matchIdx + 1}: Already completed`);
                continue;
            }
            
            // Choose winner randomly
            const randomWinner = Math.random() < 0.5 ? match.player1Id : match.player2Id;
            bracketService.updateMatchResult(bracket, round, matchIdx, randomWinner);
            
            const winnerAlias = match.winnerId === match.player1Id ? match.player1Alias : match.player2Alias;
            console.log(`Match ${matchIdx + 1}: ${match.player1Alias} vs ${match.player2Alias} -> ${winnerAlias} wins!`);
        }
        
        // If not the final round, advance winners to next round
        if (round < bracket.length - 1)
		{
            // Collect winners from this round
            const winners: Array<{id: string, alias: string}> = [];
            
            for (const match of roundMatches)
			{
                if (match.winnerId && match.winnerAlias)
				{
                    winners.push({
                        id: match.winnerId,
                        alias: match.winnerAlias
                	});
                }
            }
            
            // Handle odd number of players case
            if (winners.length % 2 !== 0 && round + 2 < bracket.length && !bracketService.hasPlayer(bracket![round + 1]!)) {
                bracketService.updateBracket(winners, bracket![round + 1]!, bracket[round + 2]);
            } else if (round + 1 < bracket.length){
                bracketService.updateBracket(winners, bracket![round + 1]!, undefined);
            }
            
            console.log(`Advanced ${winners.length} winners to round ${round + 1}`);
        }
    }
    
    // Print final bracket
    console.log(chalk.bold.green(`\n=== TOURNAMENT COMPLETED ===`));
    printBracket(bracket);
    
    // Show champion
    const finalMatch = bracket![bracket.length - 1]![0];
    if (finalMatch && finalMatch.winnerId) {
        console.log(chalk.bold.green(`\n🏆 CHAMPION: ${finalMatch.winnerAlias} 🏆\n`));
    }
}

runTournamentTest(10)

// printBracket(matches);
 
// checkWinner(matches);