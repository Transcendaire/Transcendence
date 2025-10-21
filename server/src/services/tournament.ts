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
	socket?: WebSocket
}

export class Tournament {

	private db = getDatabase();
	private bracketService: SingleEliminationBracket;
	private matchmakingService: MatchmakingService;

	private bracket: Match[][] = [];
	private currRound: number = 0;
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


	public addPlayerToTournament(alias: string, socket?: WebSocket): void
	{
		if ()
		//* chck if tournament is on the created status
		//* check if size doesnt overflow
		//*add player to the tournament (inside database)
		//*get the player and store it inside the Tournament map
	}

	public runTournament()
	{
		//*check status is not running or completed
		//*update tournament status in db
		//*generate bracket and startround()
	}

	private startRound()
	{
		//*check if it is not the last round
		//*iterates through the bracket and start all matches
	}

	private startMatch()
	{
		//*this is an issue for now. How to start match using matchmaking class?
	}

	private completeMatch()
	{
		//*store result of the match inside the database
		//*set the state of the match in the bracket class
	}

	private completeRound()
	{
		//*generate the winners array
		//*run updateBracket() from bracketclass by checking if there is still at least two rounds left 
		//*(for the nextNextRound parameter)
		//*update value of round
	}

	private endTournament()
	{
		//*chang status in database
	}

	private notifyEndOfTournament()
	{

	}

	public start



}