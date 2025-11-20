import { WebSocket } from 'ws';
import { MatchmakingService } from '../matchmaking/matchmaking.js';
import { getDatabase } from '../../db/databaseSingleton.js';
import { Match, SingleEliminationBracket } from './brackets.js';
import { errTournament, TournamentError } from "@app/shared/errors.js"
import { Player } from '../../types.js';
import { WebsocketHandler } from '@fastify/websocket';
import { sign } from 'crypto';

export enum TournamentStatus {
	CREATED = 'created',
	FULL = 'full',
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


	/**
	 * @brief Checks if a player is in the tournament
	 * @param name Player's alias
	 * @returns True if player exists in tournament
	 */
	public hasPlayer(name: string): boolean
	{
		return this.players.has(name);
	}

	/**
	 * @brief Adds a player to the tournament (in-memory and in database)
	 * @param alias Player's alias
	 * @param socket Optional WebSocket connection
	 * @throws {TournamentError} If tournament is running, completed, or full
	 */
	public addPlayerToTournament(alias: string, socket?: WebSocket): void
	{
		if (this.status === TournamentStatus.RUNNING)
			throw new TournamentError(`Impossible d'ajouter ${alias} au tournoi ${this.name}: le tournoi a déjà débuté`, errTournament.ALREADY_STARTED);

		if (this.status === TournamentStatus.COMPLETED)
			throw new TournamentError(`Impossible d'ajouter ${alias} au tournoi ${this.name}: le tournoi est terminé`, errTournament.ALREADY_OVER);
		
		if (this.players.size === this.maxPlayers)
			throw new TournamentError(`Impossible d'ajouter ${alias} au tournoi ${this.name}: le tournoi est complet`, errTournament.TOURNAMENT_FULL);
		
		try {
			this.db.addPlayerToTournament(alias, this.id, this.name);
			const player = this.db.getPlayer(alias);
			if (!player)
				throw new TournamentError(`Impossible de trouver le joueur ${alias} dans le tournoi ${this.name}`);
			this.players.set(player.alias, {
				 id: player.id,
				 alias,
				 status: 'waiting',
				 socket
				});
			if (this.players.size === this.maxPlayers)
			{
				this.status = TournamentStatus.FULL;
				this.db.setTournamentStatus(TournamentStatus.FULL, this.id);
			}
		} catch (error) {
			console.error(`Erreur lors de l'ajout de ${alias} au tournoi ${this.name}: `, error);
			throw error;
		}
	}

	/**
	 * @brief Removes a player from the tournament
	 * @param name Player's alias
	 * @throws {TournamentError} If player is not in tournament
	 */
	public removePlayerFromTournament(name: string)
	{
		if (this.players.has(name) === false)
			throw new TournamentError(`Impossible de retirer le joueur ${name} : le joueur n'est pas dans le tournoi`);
		
		this.players.delete(name);
		this.db.removePlayerFromTournament(name, this.id, this.name);
		this.status = TournamentStatus.CREATED;
		this.db.setTournamentStatus(TournamentStatus.CREATED, this.id);
	}

	/**
	 * @brief Restores a player to the tournament from database
	 * @param player Player object to restore
	 */
	public restorePlayer(player: Player): void
	{
		this.players.set(player.alias, {
			id: player.id, 
			alias: player.alias,
			status: 'waiting',
			socket: undefined
		});
	}

	public runTournament()
	{
		if (this.status !== TournamentStatus.CREATED)
			throw new TournamentError(`Impossible de lancer le tournoi ${this.name}: le tournoi est a déjà commencé ou est terminé`);

		this.db.setTournamentStatus(TournamentStatus.RUNNING, this.id);
		try {
			this.bracket = this.bracketService.generateBracket();
		} catch (error) {
			console.error(`Impossible de lancer le tournoi ${this.name}: `, error);
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
		return this.players.size;
	}

	public getStatus(): string
	{
		return this.status;
	}

	public setStatus(newStatus: string): void
	{
		switch (newStatus) {
			case 'created':
				this.status = TournamentStatus.CREATED;
				break ;
			case 'full':
				this.status = TournamentStatus.FULL;
				break ;
			case 'running':
				this.status = TournamentStatus.RUNNING;
				break ;
			case 'completed':
				this.status = TournamentStatus.COMPLETED;
				break ;
			default:
				return ;
		}
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