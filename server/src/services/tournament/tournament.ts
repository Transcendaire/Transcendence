import { WebSocket } from 'ws';
import { MatchmakingService } from '../matchmaking/matchmaking.js';
import { TournamentMatchConfig } from '../matchmaking/core/types.js';
import { getDatabase } from '../../db/databaseSingleton.js';
import { Match, SingleEliminationBracket } from './brackets.js';
import { errTournament, TournamentError } from "@app/shared/errors.js"
import { Player } from '../../types.js';
import { WebsocketHandler } from '@fastify/websocket';
import { sign } from 'crypto';
import { CustomGameSettings } from '@app/shared/types.js';
import { sendMessage } from '../../utils/websocket.js';

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
	private lastBroadcastTime: number = 0;
	private pendingCountdowns: Map<string, { match: Match; cancelled: boolean }> = new Map();

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
	 * @brief Checks if a player is active (not eliminated) in the tournament
	 * @param name Player's alias
	 * @returns True if player exists and is not eliminated
	 */
	public hasActivePlayer(name: string): boolean
	{
		const player = this.players.get(name);
		return player ? player.status !== 'eliminated' : false;
	}

	/**
	 * @brief Checks if a socket belongs to a player in the tournament
	 * @param socket WebSocket connection to check
	 * @returns True if socket belongs to a tournament player
	 */
	public hasPlayerSocket(socket: WebSocket): boolean
	{
		for (const player of this.players.values())
		{
			if (player.socket === socket)
				return true;
		}
		return false;
	}

	/**
	 * @brief Get player alias by their socket
	 * @param socket WebSocket connection to search for
	 * @returns Player alias or undefined if not found
	 */
	public getPlayerAliasBySocket(socket: WebSocket): string | undefined
	{
		for (const player of this.players.values())
		{
			if (player.socket === socket)
				return player.alias;
		}
		return undefined;
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
	 * @brief Adds a bot to the tournament (in-memory only, no database)
	 * @param botId Bot's unique ID
	 * @param botName Bot's display name
	 * @throws {TournamentError} If tournament is running, completed, or full
	 */
	public addBotToTournament(botId: string, botName: string): void
	{
		if (this.status === TournamentStatus.RUNNING)
			throw new TournamentError(`Impossible d'ajouter ${botName} au tournoi: le tournoi a déjà débuté`, errTournament.ALREADY_STARTED);
		if (this.status === TournamentStatus.COMPLETED)
			throw new TournamentError(`Impossible d'ajouter ${botName} au tournoi: le tournoi est terminé`, errTournament.ALREADY_OVER);
		if (this.players.size === this.maxPlayers)
			throw new TournamentError(`Impossible d'ajouter ${botName} au tournoi: le tournoi est complet`, errTournament.TOURNAMENT_FULL);
		if (this.players.has(botName))
		{
			console.log(`[TOURNAMENT] Bot ${botName} already in tournament, skipping`);
			return;
		}
		this.players.set(botName, {
			id: botId,
			alias: botName,
			status: 'waiting',
			socket: undefined
		});
		console.log(`[TOURNAMENT] Bot ${botName} added to tournament`);
		if (this.players.size === this.maxPlayers)
		{
			this.status = TournamentStatus.FULL;
			this.db.setTournamentStatus(TournamentStatus.FULL, this.id);
		}
	}

	/**
	 * @brief Check if a player is a bot
	 * @param alias Player's alias
	 * @returns True if player is a bot (ID starts with 'bot-')
	 */
	public isBot(alias: string): boolean
	{
		const player = this.players.get(alias);
		return player ? player.id.startsWith('bot-') : false;
	}

	/**
	 * @brief Check if there are any human players remaining (not eliminated)
	 * @returns True if at least one human player is still in the tournament
	 */
	private hasHumanPlayersRemaining(): boolean
	{
		for (const player of this.players.values())
		{
			if (!player.id.startsWith('bot-') && player.status !== 'eliminated')
				return true;
		}
		return false;
	}

	/**
	 * @brief Auto-complete tournament when only bots remain
	 * @details Picks a random bot as champion and ends the tournament
	 */
	private autoCompleteBotOnlyTournament(): void
	{
		const remainingBots = Array.from(this.players.values())
			.filter(p => p.id.startsWith('bot-') && p.status !== 'eliminated');
		
		if (remainingBots.length === 0)
		{
			console.log(`[TOURNAMENT] No bots remaining, ending tournament without champion`);
			this.status = TournamentStatus.COMPLETED;
			this.db.setTournamentStatus(TournamentStatus.COMPLETED, this.id);
			return;
		}

		const champion = remainingBots[Math.floor(Math.random() * remainingBots.length)]!;
		champion.status = 'champion';
		
		for (const player of this.players.values())
		{
			if (player !== champion)
				player.status = 'eliminated';
		}

		console.log(`[TOURNAMENT] All humans eliminated, auto-completing. Champion: ${champion.alias}`);
		this.status = TournamentStatus.COMPLETED;
		this.db.setTournamentStatus(TournamentStatus.COMPLETED, this.id);
		this.notifyEndOfTournament(champion.alias);
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
	 * @brief Eliminate a player from an active tournament (forfeit)
	 * @param name Player's alias
	 * @details Marks the player as eliminated and cancels any pending countdown.
	 */
	public eliminatePlayer(name: string): void
	{
		const player = this.players.get(name);

		if (!player)
			return;
		player.status = 'eliminated';
		player.socket = undefined;
		console.log(`[TOURNAMENT] Player ${name} eliminated (forfeit)`);
		this.cancelPendingCountdownForPlayer(name);
		if (!this.hasHumanPlayersRemaining())
		{
			console.log(`[TOURNAMENT] No human players remaining after ${name} forfeit`);
			this.autoCompleteBotOnlyTournament();
		}
	}

	/**
	 * @brief Cancel a pending countdown if a player disconnects during it
	 * @param playerName The player who disconnected
	 */
	private cancelPendingCountdownForPlayer(playerName: string): void
	{
		for (const [matchId, countdown] of this.pendingCountdowns)
		{
			const match = countdown.match;

			if (match.player1Alias === playerName || match.player2Alias === playerName)
			{
				countdown.cancelled = true;
				this.pendingCountdowns.delete(matchId);
				console.log(`[TOURNAMENT] Cancelled countdown for match ${matchId} (${playerName} disconnected)`);
				const isPlayer1 = match.player1Alias === playerName;
				const winnerId = isPlayer1 ? match.player2Id : match.player1Id;
				const winnerAlias = isPlayer1 ? match.player2Alias : match.player1Alias;
				const winner = this.players.get(winnerAlias);

				if (winner)
				{
					if (winner.socket && winner.socket.readyState === 1)
					{
						sendMessage(winner.socket, {
							type: 'gameOver',
							winner: isPlayer1 ? 'player2' : 'player1',
							lives1: isPlayer1 ? 0 : 5,
							lives2: isPlayer1 ? 5 : 0,
							isTournament: true,
							shouldDisconnect: this.currRound === this.maxRound - 1,
							forfeit: true
						});
					}
					this.completeMatch(match, winnerId, isPlayer1 ? 0 : 5, isPlayer1 ? 5 : 0);
				}
				break;
			}
		}
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
			const playersArray = Array.from(this.players.values()).map(p => ({
				id: p.id,
				alias: p.alias
			}))
			this.bracket = this.bracketService.generateBracket(playersArray);
			console.log(`[TOURNAMENT] Bracket generated: ${this.bracket.length} rounds`);
		} catch (error) {
			console.error(`Impossible de lancer le tournoi ${this.name}: `, error);
			throw error;
		}
		this.maxRound = this.bracket.length;
		this.startRound()
	}

	public getPlayerCount(): number
	{
		return this.players.size;
	}

	/**
	 * @brief Get number of active players not eliminated
	 */
	public getActivePlayerCount(): number
	{
		let count = 0;
		for (const player of this.players.values())
			if (player.status !== 'eliminated')
				count++;
		return count;
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

		if (!this.hasHumanPlayersRemaining())
		{
			console.log(`[TOURNAMENT] No human players remaining, auto-completing tournament`);
			this.autoCompleteBotOnlyTournament();
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

		const p1IsBot = this.isBot(player1.alias)
		const p2IsBot = this.isBot(player2.alias)

		if (p1IsBot && p2IsBot)
		{
			const randomWinner = Math.random() < 0.5 ? player1 : player2
			const randomLoser = randomWinner === player1 ? player2 : player1
			console.log(`[TOURNAMENT] Bot vs Bot match, auto-resolving: ${randomWinner.alias} wins`)
			player1.status = 'playing'
			player2.status = 'playing'
			match.status = 'completed'
			setTimeout(() => this.completeMatch(match, randomWinner.id, 5, 0), 100)
			return
		}

		if (p1IsBot)
		{
			if (!player2.socket)
			{
				console.error(`[TOURNAMENT] Cannot start AI match: player2 socket not available`)
				return
			}
			this.startAIMatch(match, player2, player1)
			return
		}

		if (p2IsBot)
		{
			if (!player1.socket)
			{
				console.error(`[TOURNAMENT] Cannot start AI match: player1 socket not available`)
				return
			}
			this.startAIMatch(match, player1, player2)
			return
		}

		if (!player1.socket || !player2.socket)
		{
			console.error(`[TOURNAMENT] Cannot start match: player sockets not available (${match.player1Alias}: ${!!player1.socket}, ${match.player2Alias}: ${!!player2.socket})`);
			return;
		}
		player1.status = 'playing';
		player2.status = 'playing';
		match.status = 'playing';
		this.pendingCountdowns.set(match.id, { match, cancelled: false });
		this.sendCountdown(match, player1.socket, player2.alias, player2.socket, player1.alias, () => {
			const pending = this.pendingCountdowns.get(match.id);

			if (pending?.cancelled)
				return;
			this.pendingCountdowns.delete(match.id);
			this.startMatchAfterCountdown(match, player1, player2);
		});
	}

	/**
	 * @brief Send countdown to both players before match starts
	 * @param match The match being started
	 * @param socket1 First player socket
	 * @param opponent1Name Name of first player's opponent
	 * @param socket2 Second player socket  
	 * @param opponent2Name Name of second player's opponent
	 * @param onComplete Callback when countdown finishes
	 */
	private sendCountdown(
		match: Match,
		socket1: WebSocket,
		opponent1Name: string,
		socket2: WebSocket | null,
		opponent2Name: string,
		onComplete: () => void
	): void
	{
		if (socket1 && socket1.readyState === 1)
			sendMessage(socket1, { type: 'tournamentPrepare', playerRole: 'player1', opponentName: opponent1Name });
		if (socket2 && socket2.readyState === 1)
			sendMessage(socket2, { type: 'tournamentPrepare', playerRole: 'player2', opponentName: opponent2Name });
		setTimeout(() => this.startCountdownSequence(match, socket1, opponent1Name, socket2, opponent2Name, onComplete), 500);
	}

	/**
	 * @brief Start the 3-2-1 countdown sequence
	 */
	private startCountdownSequence(
		match: Match,
		socket1: WebSocket,
		opponent1Name: string,
		socket2: WebSocket | null,
		opponent2Name: string,
		onComplete: () => void
	): void
	{
		let countdown = 3;
		const sendCount = () => {
			const pending = this.pendingCountdowns.get(match.id);

			if (pending?.cancelled)
				return;
			if (socket1 && socket1.readyState === 1)
				sendMessage(socket1, { type: 'tournamentCountdown', opponentName: opponent1Name, countdown });
			if (socket2 && socket2.readyState === 1)
				sendMessage(socket2, { type: 'tournamentCountdown', opponentName: opponent2Name, countdown });
			if (countdown > 0)
			{
				countdown--;
				setTimeout(sendCount, 1000);
			}
			else
				onComplete();
		};
		sendCount();
	}

	/**
	 * @brief Actually start the match after countdown completes
	 * @param match Match to start
	 * @param player1 First player
	 * @param player2 Second player
	 */
	private startMatchAfterCountdown(match: Match, player1: TournamentPlayer, player2: TournamentPlayer): void
	{
		if (player1.status === 'eliminated' || player2.status === 'eliminated')
		{
			console.log(`[TOURNAMENT] Match cancelled: a player was eliminated during countdown`)
			return
		}

		const gameRoomManager = this.matchmakingService.getGameRoomManager();
		const isFinalMatch = this.currRound === this.maxRound - 1;
		console.log(`[TOURNAMENT] Match is final: ${isFinalMatch} (round ${this.currRound + 1}/${this.maxRound})`);
		
		const tournamentMatchConfig: TournamentMatchConfig = {
			tournamentId: this.id,
			matchId: match.id,
			isFinalMatch,
			onComplete: (winnerId: string, score1: number, score2: number) =>
			{
				this.completeMatch(match, winnerId, score1, score2);
			},
			onUpdate: () => this.broadcastMatchUpdatesToWaitingPlayers(),
			getTournamentInfo: () => ({
				remainingPlayers: this.getActivePlayerCount(),
				totalPlayers: this.players.size
			})
		};
		
		const gameId = gameRoomManager.createGame(
			{ socket: player1.socket!, name: player1.alias, id: player1.id },
			{ socket: player2.socket!, name: player2.alias, id: player2.id },
			this.settings.powerUpsEnabled,
			this.settings.fruitFrequency,
			this.settings.lifeCount,
			tournamentMatchConfig
		);
		console.log(`[TOURNAMENT] Game ${gameId} started with powerUps: ${this.settings.powerUpsEnabled}`);

		console.log(`[TOURNAMENT] Started game ${gameId} for match ${match.id}`);
		
		if (player1.socket && player1.socket.readyState === 1)
		{
			player1.socket.send(JSON.stringify({
				type: 'gameStart',
				playerRole: 'player1',
				isCustom: this.settings.powerUpsEnabled
			}));
			console.log(`[TOURNAMENT] Sent gameStart to ${player1.alias} as player1 (custom: ${this.settings.powerUpsEnabled})`);
		}
		if (player2.socket && player2.socket.readyState === 1)
		{
			player2.socket.send(JSON.stringify({
				type: 'gameStart',
				playerRole: 'player2',
				isCustom: this.settings.powerUpsEnabled
			}));
			console.log(`[TOURNAMENT] Sent gameStart to ${player2.alias} as player2 (custom: ${this.settings.powerUpsEnabled})`);
		}
		
		(match as any).gameId = gameId;
		this.notifyWaitingPlayers();
	}

	/**
	 * @brief Notify waiting players about ongoing matches
	 */
	private notifyWaitingPlayers(): void
	{
		for (const [alias, player] of this.players.entries())
			if (player.status === 'waiting' && player.socket)
				sendMessage(player.socket, { 
					type: 'waitingForMatch',
					message: `Waiting for your match. Current round: ${this.currRound + 1}/${this.maxRound}`
				});
	}

	/**
	 * @brief Find the sibling match for a waiting player
	 * @param playerAlias Alias of the waiting player
	 * @returns The match whose winner will face this player, or undefined
	 * @details In single elimination: matches 2*X and 2*X+1 of round N feed into match X of round N+1
	 */
	private getSiblingMatchForPlayer(playerAlias: string): Match | undefined
	{
		const currentRound = this.bracket[this.currRound];
		if (!currentRound)
			return undefined;
		
		let playerMatchIndex = -1;
		for (let i = 0; i < currentRound.length; i++)
		{
			const match = currentRound[i]!;
			if (match.winnerAlias === playerAlias)
			{
				playerMatchIndex = i;
				break;
			}
		}
		
		if (playerMatchIndex === -1)
			return undefined;
		
		const siblingIndex = (playerMatchIndex % 2 === 0) ? playerMatchIndex + 1 : playerMatchIndex - 1;
		const siblingMatch = currentRound[siblingIndex];
		
		if (siblingMatch && siblingMatch.status === 'playing')
			return siblingMatch;
		
		return undefined;
	}

	/**
	 * @brief Get current match updates for spectators
	 * @returns Array of ongoing match states
	 */
	public getOngoingMatchUpdates(): Array<{ player1Name: string; player2Name: string; lives1: number; lives2: number }>
	{
		const gameRoomManager = this.matchmakingService.getGameRoomManager();
		const updates: Array<{ player1Name: string; player2Name: string; lives1: number; lives2: number }> = [];
		const currentRound = this.bracket[this.currRound];
		
		if (!currentRound)
			return updates;
			
		for (const match of currentRound)
		{
			if (match.status !== 'playing')
				continue;
			const gameId = (match as any).gameId;
			if (!gameId)
				continue;
			const gameState = gameRoomManager.getGameState(gameId);
			if (!gameState)
				continue;
			updates.push({
				player1Name: match.player1Alias,
				player2Name: match.player2Alias,
				lives1: gameState.players[0]?.lives ?? 0,
				lives2: gameState.players[1]?.lives ?? 0
			});
		}
		return updates;
	}

	/**
	 * @brief Broadcast match updates to waiting players (throttled to 500ms)
	 */
	public broadcastMatchUpdatesToWaitingPlayers(): void
	{
		const now = Date.now();
		if (now - this.lastBroadcastTime < 500)
			return;
		this.lastBroadcastTime = now;
		
		const gameRoomManager = this.matchmakingService.getGameRoomManager();
		const allUpdates = this.getOngoingMatchUpdates();
		if (allUpdates.length === 0)
			return;
			
		for (const [alias, player] of this.players.entries())
		{
			if (player.status !== 'waiting' || !player.socket)
				continue;
				
			const siblingMatch = this.getSiblingMatchForPlayer(alias);
			let siblingMatchUpdate: { player1Name: string; player2Name: string; lives1: number; lives2: number } | undefined;
			
			if (siblingMatch && siblingMatch.status === 'playing')
			{
				const gameId = (siblingMatch as any).gameId;
				if (gameId)
				{
					const gameState = gameRoomManager.getGameState(gameId);
					if (gameState)
					{
						siblingMatchUpdate = {
							player1Name: siblingMatch.player1Alias,
							player2Name: siblingMatch.player2Alias,
							lives1: gameState.players[0]?.lives ?? 0,
							lives2: gameState.players[1]?.lives ?? 0
						};
					}
				}
			}
			
			const otherMatches = allUpdates.filter(u => 
				!siblingMatchUpdate || 
				(u.player1Name !== siblingMatchUpdate.player1Name || u.player2Name !== siblingMatchUpdate.player2Name)
			);
			
			if (siblingMatchUpdate)
				sendMessage(player.socket, { type: 'tournamentMatchUpdate', siblingMatch: siblingMatchUpdate, otherMatches })
			else
				sendMessage(player.socket, { type: 'tournamentMatchUpdate', otherMatches })
		}
	}

	/**
	 * @brief Start a match with one human player vs one bot
	 * @param match The match object
	 * @param humanPlayer The human player
	 * @param botPlayer The bot player
	 */
	private startAIMatch(match: Match, humanPlayer: TournamentPlayer, botPlayer: TournamentPlayer): void
	{
		humanPlayer.status = 'playing'
		botPlayer.status = 'playing'
		match.status = 'playing'
		this.pendingCountdowns.set(match.id, { match, cancelled: false });
		this.sendCountdown(match, humanPlayer.socket!, botPlayer.alias, null, '', () => {
			const pending = this.pendingCountdowns.get(match.id);

			if (pending?.cancelled)
				return;
			this.pendingCountdowns.delete(match.id);
			this.startAIMatchAfterCountdown(match, humanPlayer, botPlayer);
		});
	}

	/**
	 * @brief Actually start the AI match after countdown completes
	 * @param match Match to start
	 * @param humanPlayer Human player
	 * @param botPlayer Bot player
	 */
	private startAIMatchAfterCountdown(match: Match, humanPlayer: TournamentPlayer, botPlayer: TournamentPlayer): void
	{
		if (humanPlayer.status === 'eliminated')
		{
			console.log(`[TOURNAMENT] AI match cancelled: ${humanPlayer.alias} was eliminated during countdown`)
			return
		}

		const gameRoomManager = this.matchmakingService.getGameRoomManager()
		const humanIsPlayer1 = match.player1Id === humanPlayer.id
		const isFinalMatch = this.currRound === this.maxRound - 1
		console.log(`[TOURNAMENT] AI Match: ${humanPlayer.alias} vs ${botPlayer.alias} (bot)`)

		const gameId = gameRoomManager.createAIGame(
			{ socket: humanPlayer.socket!, name: humanPlayer.alias, id: humanPlayer.id },
			this.settings.powerUpsEnabled,
			1,
			this.settings.fruitFrequency,
			this.settings.lifeCount,
			botPlayer.alias
		)
		const room = gameRoomManager.findGameByPlayer(humanPlayer.socket!)
		if (room)
		{
			room.tournamentMatch = {
				tournamentId: this.id,
				matchId: match.id,
				isFinalMatch,
				onComplete: (winnerId: string, lives1: number, lives2: number) =>
				{
					const actualWinnerId = winnerId === humanPlayer.id ? humanPlayer.id : botPlayer.id
					if (humanIsPlayer1)
						this.completeMatch(match, actualWinnerId, lives1, lives2)
					else
						this.completeMatch(match, actualWinnerId, lives2, lives1)
				},
				onUpdate: () => this.broadcastMatchUpdatesToWaitingPlayers(),
				getTournamentInfo: () => ({
					remainingPlayers: this.getActivePlayerCount(),
					totalPlayers: this.players.size
				})
			}
		}

		console.log(`[TOURNAMENT] AI game ${gameId} started for match ${match.id}`)

		if (humanPlayer.socket && humanPlayer.socket.readyState === 1)
		{
			humanPlayer.socket.send(JSON.stringify({
				type: 'gameStart',
				playerRole: humanIsPlayer1 ? 'player1' : 'player2',
				isCustom: this.settings.powerUpsEnabled
			}))
			console.log(`[TOURNAMENT] Sent gameStart to ${humanPlayer.alias}`)
		}

		(match as any).gameId = gameId
		this.notifyWaitingPlayers();
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
		const p1IsBot = match.player1Id.startsWith('bot-')
		const p2IsBot = match.player2Id.startsWith('bot-')

		console.log(`[TOURNAMENT] Match ${match.id} completed: ${match.player1Alias} ${livesA}-${livesB} ${match.player2Alias}`);
		this.bracketService.updateMatchResult(match, winnerId);
		if (!p1IsBot && !p2IsBot)
		{
			this.db.recordMatch(this.id, this.name, match.player1Id, match.player2Id, livesA, livesB, 'completed');
			try
			{
				const p1Won = winnerId === match.player1Id;
				this.db.recordGameResult(
					match.player1Alias,
					'1v1',
					match.player2Alias,
					2,
					livesA,
					livesB,
					p1Won ? 1 : 2,
					p1Won ? 'win' : 'loss',
					this.id
				);
				this.db.recordGameResult(
					match.player2Alias,
					'1v1',
					match.player1Alias,
					2,
					livesB,
					livesA,
					p1Won ? 2 : 1,
					p1Won ? 'loss' : 'win',
					this.id
				);
				console.log(`[TOURNAMENT] Match history recorded for ${match.player1Alias} vs ${match.player2Alias}`);
			}
			catch (error)
			{
				console.error('[TOURNAMENT] Failed to record match history:', error);
			}
		}
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
			this.recordTournamentResults(championAlias);
			this.notifyEndOfTournament(championAlias);
		}
	}

	/**
	 * @brief Record tournament results for all human players
	 * @param championAlias Alias of the tournament champion
	 */
	private recordTournamentResults(championAlias: string): void
	{
		const humanPlayers = Array.from(this.players.values()).filter(p => !p.id.startsWith('bot-'));
		if (humanPlayers.length === 0)
			return;

		const totalParticipants = this.players.size;
		const matchResults = this.calculatePlayerMatchResults();

		for (const player of humanPlayers)
		{
			const position = this.calculatePlayerPosition(player.alias, championAlias);
			const stats = matchResults.get(player.alias) || { won: 0, lost: 0 };

			try
			{
				this.db.recordTournamentResult(
					player.alias,
					this.id,
					this.name,
					position,
					totalParticipants,
					stats.won,
					stats.lost
				);
				console.log(`[TOURNAMENT] Recorded result for ${player.alias}: position ${position}, ${stats.won}W-${stats.lost}L`);
			}
			catch (error)
			{
				console.error(`[TOURNAMENT] Failed to record result for ${player.alias}:`, error);
			}
		}
	}

	/**
	 * @brief Calculate wins and losses for each player from bracket
	 * @returns Map of player alias to win/loss counts
	 */
	private calculatePlayerMatchResults(): Map<string, { won: number; lost: number }>
	{
		const results = new Map<string, { won: number; lost: number }>();

		for (const round of this.bracket)
		{
			for (const match of round)
			{
				if (match.status !== 'completed' || !match.winnerId)
					continue;
				const p1IsBot = match.player1Id.startsWith('bot-');
				const p2IsBot = match.player2Id.startsWith('bot-');
				if (!p1IsBot)
				{
					const stats = results.get(match.player1Alias) || { won: 0, lost: 0 };
					if (match.winnerId === match.player1Id)
						stats.won++;
					else
						stats.lost++;
					results.set(match.player1Alias, stats);
				}
				if (!p2IsBot && match.player2Alias !== '~TBD')
				{
					const stats = results.get(match.player2Alias) || { won: 0, lost: 0 };
					if (match.winnerId === match.player2Id)
						stats.won++;
					else
						stats.lost++;
					results.set(match.player2Alias, stats);
				}
			}
		}
		return results;
	}

	/**
	 * @brief Calculate player's final position in tournament
	 * @param playerAlias Player's alias
	 * @param championAlias Champion's alias
	 * @returns Position (1 = champion, 2 = finalist, etc.)
	 */
	private calculatePlayerPosition(playerAlias: string, championAlias: string): number
	{
		if (playerAlias === championAlias)
			return 1;

		const finalMatch = this.bracket[this.maxRound - 1]?.[0];
		if (finalMatch)
		{
			const finalistAlias = finalMatch.player1Alias === championAlias
				? finalMatch.player2Alias
				: finalMatch.player1Alias;
			if (playerAlias === finalistAlias)
				return 2;
		}

		for (let round = this.maxRound - 2; round >= 0; round--)
		{
			for (const match of this.bracket[round] || [])
			{
				if (match.status !== 'completed')
					continue;
				const loserAlias = match.winnerId === match.player1Id
					? match.player2Alias
					: match.player1Alias;
				if (loserAlias === playerAlias)
				{
					const playersEliminatedThisRound = Math.pow(2, this.maxRound - round - 1);
					return playersEliminatedThisRound + 1;
				}
			}
		}
		return this.maxPlayers;
	}

	private notifyEndOfTournament(championAlias: string)
	{
		for (const [alias, player] of this.players.entries())
		{
			if (player.socket)
			{
				sendMessage(player.socket, {
					type: 'tournamentComplete',
					champion: championAlias,
					tournamentName: this.name
				});
			}
		}
	}

}