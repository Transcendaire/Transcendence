import { getDatabase } from "../../db/databaseSingleton.js";
import { randomInt } from "crypto";
import { BracketError } from "@app/shared/errors.js"
import { machine } from "os";
import { match } from "assert";

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
    generateBracket(): Match[][];
	updateMatchResult(match: Match, winnerId: string): void
    isRoundComplete(bracket: Match[][], round: number): boolean;
	updateBracket(winners: Array<{id: string, alias: string}>, toUpdateRound: Match[], nextNextRound: Match[] | null): void;
    advanceWinner(match: Match, playerAlias: string, playerId: string, updatePlayer1: number): void;
}

/**
 * @class SingleEliminationBracket
 * @brief Implements a single elimination tournament bracket system
 *
 * This class manages bracket generation, match updates, and player advancement
 * in a single elimination tournament format. It handles cases where the number
 * of players is odd by automatically advancing players to the next round.
 */
export class SingleEliminationBracket implements BracketService 
{
	private db = getDatabase();
	private movedPlayers = new Map<string, number>();
	private	maxRound: number = 0;
	public readonly	tournamentId: string = "";
	public readonly	tournamentName: string = "";

	constructor(tournamentId:string, tournamentName: string)
	{
		this.tournamentId = tournamentId;
		this.tournamentName = tournamentName;
	}
	/**
	 * @brief Generates the complete bracket structure for a tournament
	 * @param tournamentId ID of the tournament
	 * @param tournamentName Name of the tournament
	 * @return 2D array of matches representing the tournament bracket
	 */
	public	generateBracket(): Match[][]
	{
		let brackets: Match[][] = [];
		let totalMatches: number = this.findTotalNumberOfMatches(this.db.getTournament(this.tournamentId, undefined));
		let players = this.db.getTournamentPlayers(this.tournamentId);
		let playersCount = players.length;
		let round = 0;

		while (totalMatches)
		{
			let roundMatches = this.getMatchesPerRound(playersCount);
			const matches: Match[] = [];

			let i = 0;
			for (let matchNumber = 0; matchNumber < roundMatches; matchNumber++)
			{
				if (round === 0)
				{
					let player1 = { id: players[i].player_id, alias: players[i].alias };
					let player2 = { id: players[i + 1].player_id, alias: players[i + 1].alias };

					this.storeFirstRoundMatch(player1, player2, matches, matchNumber);
				}
				else
				{
					matches.push({
						id: `round-${round}-match-${matchNumber}`,
						player1Id: '~TBD',
						player2Id: '~TBD',
						player1Alias: '~TBD',
						player2Alias: '~TBD',
						round,
						status: 'pending'
					});
				}
				i += 2;
			}
			brackets.push(matches);
			playersCount = Math.ceil(playersCount / 2); //* if carry over, math.ceil accounts for it
			totalMatches -= roundMatches;
			round++
		}
		return brackets;
	}

	/**
	 * @brief Updates a match with the winner information
	 * @param match Match object
	 * @param winnerId ID of the winning player
	 * @throws Error if the specified match cannot be found
	 */
	public updateMatchResult(match: Match, winnerId: string): void
	{
		match.winnerId = winnerId;
		let updatedWinnerAlias: string = this.db.getPlayerBy("id", winnerId)?.alias as string;
		match.winnerAlias = updatedWinnerAlias;
		match.status = "completed";
	}

	/**
	 * @brief Checks if all matches in a round are completed
	 * @param bracket The tournament bracket
	 * @param round Round number to check
	 * @return true if all matches in the round are completed, false otherwise
	 * @throws Error if bracket or round information is invalid
	 */
    public isRoundComplete(bracket: Match[][], round: number): boolean
	{
		if (!bracket || round === undefined)
			throw new BracketError(`isRoundComplete: cannot find informations on round ${round}`);

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

//* This function MUST be called with the winners array already defined

	/**
	 * @brief Updates bracket with an array of players that won in the previous round.
	 * @param winners Array of player objects with id and alias
	 * @param toUpdateRound Array of matches to update with winners
	 * @param nextNextRound Optional next round matches (for handling odd number of players)
	 */
	public updateBracket(winners: Array<{id: string, alias: string}>, toUpdateRound: Match[], nextNextRound: Match[] | null): void
	{
		let i = 0;
		if (this.hasPlayer(toUpdateRound))
		{
			const match = toUpdateRound[0];
			const toMove = {id: match!.player1Id, alias: match!.player1Alias};
			winners.push(toMove);
		}
	
		if (winners.length % 2) //* means there are an odd number of players in the current round
			this.moveLeftoverPlayer(winners, nextNextRound![0]!);
		for (let w = 0; w < winners.length;)
		{
			if (i === toUpdateRound.length)
				break ;
			let nextMatch = toUpdateRound[i]!;
			const winner = winners[w]!;
			if (nextMatch.player1Alias === '~TBD')
				this.advanceWinner(nextMatch, winner.id, winner.alias, 1)
			else if (nextMatch.player1Alias !== '~TBD' && nextMatch.player2Alias === '~TBD')
			{
				this.advanceWinner(nextMatch, winner.id, winner.alias, 0)
				i++;
			}
			else
				i++;
			w++;
		}
	}

	/**
	 * @brief Handles moving a player to the next round when there's an odd number of players
	 * @param winners Array of players who won in the current round
	 * @param nextNextMatch Match where the moved player will be placed
	 * @details Tries to select players who haven't been moved before to keep the tournament fair
	 */
	public advanceWinner(nextMatch: Match, playerId: string, playerAlias: string, updatePlayer1: number): void
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

	/**
 	* @brief Calculates total number of matches needed for a tournament
 	* @param tournament The tournament object containing player count
 	* @return Total number of matches (always player count - 1)
 	* @throws Error if tournament is undefined
 	*/
	private findTotalNumberOfMatches(tournament: any): number
	{
		if (tournament === undefined)
			throw new BracketError(`findMaxRound: Couldn't find tournament ${this.tournamentName} in database`);
		
		let nbPlayers: number = tournament.curr_nb_players;
		return nbPlayers - 1;
	}


	/**
	 * @brief Calculates how many matches are needed in a specific round
	 * @return Number of matches for the round (half of player count)
	 */
	private getMatchesPerRound(nbPlayers: number): number
	{
		return Math.floor(nbPlayers / 2) 
	}

	/**
 	* @brief Creates and stores a match for the first round
 	* @param player1 First player object with id and alias
 	* @param player2 Second player object with id and alias
 	* @param matches Array to store the created match
 	* @param currMatchNb Current match number in the round
 	*/
	private storeFirstRoundMatch(player1: any, player2: any, matches: Match[], currMatchNb: number): void
	{
		matches.push({
			id: `round-0-match-${currMatchNb}`,
			player1Id: player1.id,
			player2Id: player2.id,
			player1Alias: player1.alias,
			player2Alias:player2.alias,
			round: 0,
			status: 'pending'
		});
		this.db.recordMatch(this.tournamentId, this.tournamentName, player1.id, player2.id, 0, 0, 'pending')
	}

	/**
 	* @brief Handles moving a player to the next round when there's an odd number of players
 	* @param winners Array of players who won in the current round
 	* @param nextNextMatch Match where the moved player will be placed
 	* @details Tries to select players who haven't been moved before to keep the tournament fair
 	*/
	private moveLeftoverPlayer(winners: Array<{id: string, alias: string}>, nextNextMatch: Match): void
	{
		const unmovedPlayers = winners.filter((itr) => !this.movedPlayers.has(itr.id));
		let toMovePlayer;
		
		if (unmovedPlayers.length === 0)
		{
			let random = (randomInt(0, this.movedPlayers.size)) % winners.length;
			toMovePlayer = winners[random];
			let oldValue = this.movedPlayers.get(toMovePlayer!.id);
			this.movedPlayers.set(toMovePlayer!.id, oldValue! + 1);
		}
		else
		{
			toMovePlayer = unmovedPlayers[0];
			this.movedPlayers.set(toMovePlayer!.id, 1);
		}
		this.advanceWinner(nextNextMatch, toMovePlayer!.id, toMovePlayer!.alias, 1);
		let toDeleteIndex = winners.indexOf(toMovePlayer!);
		winners.splice(toDeleteIndex, 1);
		console.log(`moved player is ${toMovePlayer?.alias}`);
	}

	public hasPlayer(matches: Match[]): boolean
	{
		return matches.some(match => match.player1Id != '~TBD' || match.player2Id != '~TBD');
	}
}
