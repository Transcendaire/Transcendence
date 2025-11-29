import { WebSocket } from 'ws';
import { MatchmakingService } from '../matchmaking/matchmaking.js';
import { getDatabase } from '../../db/databaseSingleton.js';
import { Match, SingleEliminationBracket } from './brackets.js';
import { errTournament, TournamentError } from "@app/shared/errors.js"
import { Player } from '../../types.js';
import { WebsocketHandler } from '@fastify/websocket';
import { sign } from 'crypto';
import { CustomGameSettings } from '@app/shared/types.js';

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
	private settings: CustomGameSettings;

	public readonly id: string =  "";
	public readonly name: string = "";
	public readonly maxPlayers: number;

	constructor(id: string, name: string, maxPlayers: number, matchmakingService: MatchmakingService, settings?: CustomGameSettings)
	{
		this.id = id;
		this.name = name;
		this.maxPlayers = maxPlayers;
		this.matchmakingService = matchmakingService;
		this.bracketService = new SingleEliminationBracket(id, name);
		this.settings = settings || {
			lifeCount: 5,
			powerUpsEnabled: false,
			fruitFrequency: 'normal'
		};
		console.log(`[TOURNAMENT] Created with settings: powerUps=${this.settings.powerUpsEnabled}, lifeCount=${this.settings.lifeCount}`);
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
		if (this.players.has(alias))
		{
			console.log(`[TOURNAMENT] Player ${alias} already in tournament, skipping`);
			return;
		}
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
			console.log(`[TOURNAMENT] Player ${alias} added with socket: ${socket ? 'YES' : 'NO'}`);
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
		console.log(`[TOURNAMENT] runTournament called for ${this.name} with ${this.players.size} players, status: ${this.status}`);
		if (this.status !== TournamentStatus.CREATED && this.status !== TournamentStatus.FULL)
			throw new TournamentError(`Impossible de lancer le tournoi ${this.name}: le tournoi est a déjà commencé ou est terminé`);

		this.db.setTournamentStatus(TournamentStatus.RUNNING, this.id);
		this.status = TournamentStatus.RUNNING;
		
		console.log(`[TOURNAMENT] Generating bracket for ${this.players.size} players`);
		try {
			this.bracket = this.bracketService.generateBracket();
			console.log(`[TOURNAMENT] Bracket generated: ${this.bracket.length} rounds`);
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
		if (this.currRound >= this.maxRound)
		{
			this.endTournament();
			return;
		}
		console.log(`[TOURNAMENT] Starting round ${this.currRound + 1}/${this.maxRound}`)
		for (let i = 0; i < this.bracket![this.currRound]!.length; i++)
		{
			const currMatch = this.bracket![this.currRound]![i];
			console.log(`[TOURNAMENT] Match ${i}: ${currMatch?.player1Alias} vs ${currMatch?.player2Alias}`);
			if (currMatch?.player2Alias === '~TBD') {
				console.log(`[TOURNAMENT] Match ${i} is a bye match, ${currMatch.player1Alias} advances automatically`);
				currMatch.status = 'completed';
				currMatch.winnerId = currMatch.player1Id;
				this.bracketService.updateMatchResult(currMatch, currMatch.player1Id);
				continue;
			}
			this.startMatch(currMatch!);
		}
	}

	private startMatch(match: Match)
	{
		console.log(`[TOURNAMENT] startMatch: ${match.player1Alias} vs ${match.player2Alias}`);
		const player1 = this.players.get(match.player1Alias);
		const player2 = this.players.get(match.player2Alias);
		const gameRoomManager = this.matchmakingService.getGameRoomManager();

		if (!player1 || !player2)
		{
			console.error(`[TOURNAMENT] Cannot start match: players not found (${match.player1Alias}: ${!!player1}, ${match.player2Alias}: ${!!player2})`);
			console.error(`[TOURNAMENT] Available players:`, Array.from(this.players.keys()));
			return;
		}
		if (!player1.socket || !player2.socket)
		{
			console.error(`[TOURNAMENT] Cannot start match: player sockets not available (${match.player1Alias}: ${!!player1.socket}, ${match.player2Alias}: ${!!player2.socket})`);
			return;
		}
		player1.status = 'playing';
		player2.status = 'playing';
		match.status = 'playing';
		
		const isFinalMatch = this.currRound === this.maxRound - 1;
		console.log(`[TOURNAMENT] Match is final: ${isFinalMatch} (round ${this.currRound + 1}/${this.maxRound})`);
		
		const gameId = gameRoomManager.createGame(
			{ socket: player1.socket, name: player1.alias, id: player1.id },
			{ socket: player2.socket, name: player2.alias, id: player2.id },
			this.settings.powerUpsEnabled,
			this.settings.fruitFrequency,
			this.settings.lifeCount,
			{
				tournamentId: this.id,
				matchId: match.id,
				isFinalMatch,
				onComplete: (winnerId: string, score1: number, score2: number) =>
				{
					this.completeMatch(match, winnerId, score1, score2);
				}
			}
		);
		console.log(`[TOURNAMENT] Game ${gameId} started with powerUps: ${this.settings.powerUpsEnabled}`);

		console.log(`[TOURNAMENT] Started game ${gameId} for match ${match.id}`);
		
		if (player1.socket.readyState === 1)
		{
			player1.socket.send(JSON.stringify({
				type: 'gameStart',
				playerRole: 'player1',
				isCustom: this.settings.powerUpsEnabled
			}));
			console.log(`[TOURNAMENT] Sent gameStart to ${player1.alias} as player1 (custom: ${this.settings.powerUpsEnabled})`);
		}
		if (player2.socket.readyState === 1)
		{
			player2.socket.send(JSON.stringify({
				type: 'gameStart',
				playerRole: 'player2',
				isCustom: this.settings.powerUpsEnabled
			}));
			console.log(`[TOURNAMENT] Sent gameStart to ${player2.alias} as player2 (custom: ${this.settings.powerUpsEnabled})`);
		}
		
		(match as any).gameId = gameId;
		for (const [alias, player] of this.players.entries())
		{
			if (player.status === 'waiting' && player.socket)
			{
				this.sendMessage(player.socket, { 
					type: 'waitingForMatch',
					message: `Waiting for your match. Current round: ${this.currRound + 1}/${this.maxRound}`
				});
			}
		}
	}

	/**
	 * @brief Called when a game finishes
	 * @param match The match that was completed
	 * @param winnerId ID of the winning player
	 * @param scoreA Score of player 1
	 * @param scoreB Score of player 2
	 */
    public completeMatch(match: Match, winnerId: string, livesA: number, livesB: number): void
	{
		const winnerAlias = winnerId === match.player1Id ? match.player1Alias : match.player2Alias;
		const loserAlias = winnerId === match.player1Id ? match.player2Alias : match.player1Alias;
		const winner = this.players.get(winnerAlias);
		const loser = this.players.get(loserAlias);
		const currentRoundMatches = this.bracket[this.currRound];

		console.log(`[TOURNAMENT] Match ${match.id} completed: ${match.player1Alias} ${livesA}-${livesB} ${match.player2Alias}`);
		this.bracketService.updateMatchResult(match, winnerId);
		this.db.recordMatch(this.id, this.name, match.player1Id, match.player2Id, livesA, livesB, 'completed');
		if (winner)
			winner.status = 'waiting';
		if (loser)
			loser.status = 'eliminated';
		if (currentRoundMatches && this.isRoundComplete(currentRoundMatches))
		{
			console.log(`[TOURNAMENT] Round ${this.currRound + 1} completed`);
			this.completeRound(this.currRound);
		}
	}

	private isRoundComplete(roundMatches: Match[]): boolean
	{
		return roundMatches.every(match => match.status === 'completed');
	}

	private completeRound(round: number): void
	{
		const winners: Array<{id: string, alias: string}> = [];
		const roundMatches = this.bracket![round]!;

		for (const match of roundMatches)
			winners.push({ id: match.winnerId!, alias: match.winnerAlias! });
		if (round + 2 < this.bracket.length)
			this.bracketService.updateBracket(winners, this.bracket[round + 1]!, this.bracket[round + 2]!)
		else if (round + 1 < this.bracket.length)
			this.bracketService.updateBracket(winners, this.bracket[round + 1]!, null);
		this.currRound++;
		if (this.currRound < this.maxRound)
		{
			console.log(`[TOURNAMENT] Preparing round ${this.currRound + 1}`);
			this.startRound();
		}
		else
			this.endTournament();
	}

	private endTournament()
	{
		const finalMatch = this.bracket[this.maxRound - 1]?.[0];
		const championAlias = finalMatch?.winnerAlias!;
		const champion = this.players.get(championAlias);

		this.status = TournamentStatus.COMPLETED;
		this.db.setTournamentStatus(TournamentStatus.COMPLETED, this.id);
		if (finalMatch && finalMatch.winnerId && champion)
		{
			champion.status = 'champion';
			console.log(`[TOURNAMENT] Tournament ${this.name} completed! Champion: ${championAlias}`);
			this.notifyEndOfTournament(championAlias);
		}
	}

	private notifyEndOfTournament(championAlias: string)
	{
		for (const [alias, player] of this.players.entries())
		{
			if (player.socket)
			{
				this.sendMessage(player.socket, {
					type: 'tournamentComplete',
					champion: championAlias,
					tournamentName: this.name
				});
			}
		}
	}

	private sendMessage(socket: WebSocket, message: any): void
	{
		if (socket && socket.readyState === socket.OPEN)
		{
			socket.send(JSON.stringify(message));
		}
	}
}