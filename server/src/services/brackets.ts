import { getDatabase } from "../db/databaseSingleton.js";

export interface Match {
    id: string;
    player1Id: string;
    player2Id: string;
	player1Alias: string;
	player2Alias: string;
    winnerId?: string;
    round: number;
    status: "pending" | "playing" | "completed";
}

interface BracketService {
    generateBracket(tournamentId: string): Match[][];
    getNextMatches(bracket: Match[][], round: number): Match[];
    advanceWinner(bracket: Match[][], matchId: string, winnerId: string): void;
    isRoundComplete(bracket: Match[][], round: number): boolean;
}

export class SingleEliminationBracket implements BracketService 
{
	public generateBracket(tournamentId: string): Match[][]
	{
		let bracket: Match[][] = [];
		let round = 0;
		const db = getDatabase();
		let players = db.getTournamentPlayers(tournamentId);
		let isOdd: boolean = (players.length % 2) == 1;
	
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
				}
			}
			bracket.push(matches);

			players = matches.map((match, index) => ({
				player_id: `winner-of-${match.id}`,
				alias: 'TBD'
			}));

			round++;
		}
		return bracket;
	}


    public getNextMatches(bracket: Match[][], round: number): Match[]
	{
		

		const match: Match[] = [];
		return match;
	}
    public advanceWinner(bracket: Match[][], matchId: string, winnerId: string): void {}
    public isRoundComplete(bracket: Match[][], round: number): boolean {return true;}
}

