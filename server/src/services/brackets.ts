import { getDatabase } from "../db/databaseSingleton.js";


//! Big issue with numbers that are even but not multiple of 4 (some players just disappear)
export interface Match {
    id: string;
    player1Id: string;
    player2Id: string;
	player1Alias: string;
	player2Alias: string;
    winnerId?: string;
    winnerAlias?: string;
    round: number;
    status: "pending" | "playing" | "completed";
}

interface BracketService {
    generateBracket(tournamentId: string, tournamentName: string): Match[][];
    advanceWinner(match: Match, playerAlias: string, playerId: string, updatePlayer1: number): void;
    isRoundComplete(bracket: Match[][], round: number): boolean;
}

export class SingleEliminationBracket implements BracketService 
{
	private db = getDatabase();
	private	maxRound: number = 0;

	public generateBracket(tournamentId: string, tournamentName: string): Match[][]
	{
		let bracket: Match[][] = [];
		let round = 0;
		let players = this.db.getTournamentPlayers(tournamentId);
	
		while (players.length > 1)
		{	
			const matches: Match[] = [];

			for (let i = 0; i < players.length; i += 2)
			{
				if (i + 1 < players.length)
				{
					matches.push({
						id: `round-${round}-match-${Math.floor(i/2)}`,
						player1Id: players[i].player_id,
						player2Id: players[i + 1].player_id,
						player1Alias: players[i].alias,
						player2Alias:players[i + 1].alias,
						round,
						status: 'pending'
					});
					if (round === 0)
						this.db.recordMatch(tournamentId, tournamentName, players[i].player_id, players[i + 1].player_id, 0, 0, 'pending')
				}
			}
			bracket.push(matches);

			players = matches.map((match, index) => ({
				player_id: `winner-of-${match.id}`,
				alias: 'TBD'
			}));

			round++;
		}
		this.maxRound = round;
		return bracket;
	}




	public updateMatchResult(bracket: Match[][], round: number, match: number, winnerId: string)
	{
		if (round === undefined || match === undefined || !bracket[round] || !bracket[round][match])
			throw new Error(`updateMatchResult: cannot find bracket information for round-${round}-match-${match}`) ;

		bracket[round][match].winnerId = winnerId;
		let updatedWinnerAlias: string = this.db.getPlayerBy("id", winnerId)?.alias as string;
		bracket[round][match].winnerAlias = updatedWinnerAlias;
		bracket[round][match].status = "completed";
	}


	private checkBracket(bracket: Match[][], round: number)
	{
		if (!bracket || round === undefined || !bracket[round])
			throw new Error(`updateBracket: cannot find bracket information for round ${round}`);

		if (round === this.maxRound)
		{
			console.log("max round reached");
			return ; //!announce the winner or make it so the updateBracket fnction never runs when there's just one match left
		}

		if (!bracket[round])
			throw new Error(`updateBracket: cannot find bracket information for round ${round}`);

		if (!bracket[round + 1])
			throw new Error(`updateBracket: round ${round + 1} doesn't exist`)

	}


	public advanceWinner(nextMatch: Match, playerAlias: string, playerId: string, updatePlayer1: number)
	{
		if (updatePlayer1)
		{
			nextMatch.player1Alias = playerAlias;
			nextMatch.player1Id = playerId;
		}
		else 
		{
			nextMatch.player2Alias = playerAlias;
			nextMatch.player2Id = playerId;
		}
	}

	public updateBracket(bracket: Match[][], round: number)
	{
		this.checkBracket(bracket, round);
		if (!bracket[round])
				return ;
		for (let i = 0; i < bracket[round].length; i++)
		{
			let j = 0;
			const currMatch = bracket[round][i];
			if (currMatch?.status === "completed" && currMatch.winnerId)
			{
				let nextMatch = bracket[round + 1]?.[j];
				if (!nextMatch)
				{
					j++;
					continue ;
				}
				this.advanceWinner(nextMatch, currMatch.winnerAlias as string, currMatch.winnerId as string, (i % 2));
				if (i % 2)
					j++; //* to update the match level of the next round;
			}
		}
	}


    public isRoundComplete(bracket: Match[][], round: number): boolean
	{
		if (!bracket || round === undefined)
			throw new Error(`isRoundComplete: cannot find informations on round ${round}`);

		let isComplete: boolean = true;
		bracket[round]?.forEach((match) => {
			if (match.status !== "completed")
			{
				isComplete = false;
				return ;
			}
		})
		return isComplete;
	}
}

/*
tournament :
generate brackets
run match4es -> status is 'playing'
recordResult
*/