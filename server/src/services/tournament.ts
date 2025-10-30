import { WebSocket } from 'ws';
import { MatchmakingService } from './matchmaking.js';
import { getDatabase } from '../db/databaseSingleton.js';
import { Player } from '../types.js';
import { Match, SingleEliminationBracket } from './brackets.js';
import { WebsocketHandler } from '@fastify/websocket';
import { sign } from 'crypto';

export enum TournamentStatus {
	CREATED = 'created',
	RUNNING = 'running',
	COMPLETED = 'completed'
}

export interface TournamentPlayer {
	id: string;
	alias: string;
	status: 'waiting' | 'playing' | 'eliminated' | 'champion'
	socket?: WebSocket | undefined
}

export class Tournament {

	private db = getDatabase();
	private bracketService: SingleEliminationBracket;
	private matchmakingService: MatchmakingService;

	private bracket: Match[][] = [];
	private currRound: number = 0;
	private maxRound: number = 0;
	private status: TournamentStatus = TournamentStatus.CREATED;
	private players: Map<string, TournamentPlayer> = new Map();

	public readonly id: string =  "";
	public readonly name: string = "";
	public readonly maxPlayers: number;

	constructor(id: string, name: string, maxPlayers: number, matchmakingService: MatchmakingService)
	{
		this.id = id;
		this.name = name;
		this.maxPlayers = maxPlayers;
		this.matchmakingService = matchmakingService;
		this.bracketService = new SingleEliminationBracket(id, name);
	}


	public hasPlayer(name: string): boolean
	{
		return this.players.has(name);
	}

	public addPlayerToTournament(alias: string, socket?: WebSocket): void
	{
    	console.log(`🔵 [START] Adding ${alias} to tournament ${this.name}`);
    	console.log(`   Current players.size BEFORE: ${this.players.size}`);
		if (this.status !== TournamentStatus.CREATED)
			throw new Error(`addPlayerToTournament: cannot add ${alias} to tournament ${this.name}: tournament already started or ended`);
		
		if (this.players.size + 1 > this.maxPlayers)
			throw new Error(`addPlayerToTournament: cannot add ${alias} to tournament ${this.name}: tournament full`);
		
		try {
			this.db.addPlayerToTournament(alias, this.id, this.name);
			const player = this.db.getPlayer(alias);
			if (!player)
				throw new Error(`addPlayerToTournament: cannot find player with alias ${alias} in tournament ${this.name}`);
			console.log(`   ✅ Found player in DB:`, player);
			this.players.set(player.alias, {
				 id: player.id,
				 alias,
				 status: 'waiting',
				 socket
				});
		} catch (error) {
			console.error(`addPlayerToTournament: error while adding ${alias} to ${this.name}: `, error);
			throw error;
		}
	}

	public removePlayerFromTournament(name: string)
	{
		if (this.players.has(name) === false)
			throw new Error(`removePlayerFromTournament: cannot remove player ${name} : player not in tournament`);
		
		this.players.delete(name);
		this.db.removePlayerFromTournament(name, this.id, this.name);
	}

	public runTournament()
	{
		if (this.status !== TournamentStatus.CREATED)
			throw new Error(`runTournament: cannot run tournament ${this.name}: tournament already started or finished`);

		this.db.setTournamentStatus(TournamentStatus.RUNNING, this.id);
		try {
			this.bracket = this.bracketService.generateBracket();
		} catch (error) {
			console.error(`runTournament: cannot start tournament ${this.name}: `, error);
			throw error;
		}
		this.maxRound = this.bracket.length;
		this.startRound()
		//*then startMatch(). 
		//*add an event monitoring for completeMatch
		//*then run completeRound and start again
		//*check if it is the last round before doing another turn, especially with completeRound()
	}

	public getPlayerCount(): number
	{
		console.log(`📊 getPlayerCount() for ${this.name}: ${this.players.size}`);
		return this.players.size;
	}

	public getStatus(): string
	{
		return this.status;
	}

	private startRound()
	{
		if (this.currRound === this.maxRound)
			this.endTournament();
		for (let i = 0; i < this.bracket![this.currRound]!.length; i++)
		{
			const currMatch = this.bracket![this.currRound]![i];
			console.log( "match ", i, ": ", currMatch?.player1Alias, " VERSUS ", currMatch?.player2Alias);
			this.startMatch(currMatch!);
		}
		this.currRound++;
		//*check if it is not the last round
		//*iterates through the bracket and start all matches
	}

	private startMatch(match: Match)
	{
		//*this is an issue for now. How to start match using matchmaking class?
	}

	private completeMatch(match: Match, scoreA: number, scoreB: number)
	{//! this.currRound might be at round+1 (if func called too late)
		const winnerId: string = (scoreA > scoreB ? match.player1Id : match.player2Id);

		this.bracketService.updateMatchResult(match, winnerId);
		this.db.recordMatch(this.id, this.name, match.player1Id, match.player2Id, scoreA, scoreB, 'completed')
		//*store result of the match inside the database
		//*set the state of the match in the bracket class
	}

	private completeRound(round: number): void
	{
		const winners: Array<{id: string, alias: string}> = [];
		const roundMatches = this.bracket![round]!;

		for (const match of roundMatches)
			winners.push({ id: match.winnerId!, alias: match.winnerAlias! });

		if (this.currRound + 2 < this.bracket.length)
			this.bracketService.updateBracket(winners, this.bracket[round + 1]!, this.bracket[round + 2]!)
		else
			this.bracketService.updateBracket(winners, this.bracket[round + 1]!, null);
		this.currRound++;
		//*generate the winners array
		//*run updateBracket() from bracketclass by checking if there is still at least two rounds left 
		//*(for the nextNextRound parameter)
		//*update value of round
	}

	private prepareRound()
	{
		
	}
	private endTournament()
	{
		//*chang status in database
	}

	private notifyEndOfTournament()
	{
		//*send message to all players through websockets?
	}




}