import { WebSocket } from 'ws'
import { Player } from './types.js'
import { GameRoomManager } from '../game/gameRoomManager.js'
import { QuickMatchService } from './quickMatch.js'
import { LobbyManager } from '../lobby/lobbyManager.js'
import { TournamentManagerService } from '../../tournament/tournamentManager.js'
import { FriendStatusService } from '../../friends/FriendStatusService.js'
import { sendMessage } from '../../../utils/websocket.js'
import { getDatabase } from '../../../db/databaseSingleton.js'

/**
 * @brief Handles player disconnect and surrender logic
 * @details Manages cleanup when players disconnect or surrender,
 *          including tournament forfeit handling and match result recording
 */
export class DisconnectHandler
{
	private playerSockets: Map<WebSocket, Player>
	private playerNameToSocket: Map<string, WebSocket>
	private gameRoomManager: GameRoomManager
	private quickMatch: QuickMatchService
	private lobbyManager: LobbyManager
	private tournamentManager: TournamentManagerService
	private friendStatus: FriendStatusService

	constructor(
		playerSockets: Map<WebSocket, Player>,
		playerNameToSocket: Map<string, WebSocket>,
		gameRoomManager: GameRoomManager,
		quickMatch: QuickMatchService,
		lobbyManager: LobbyManager,
		tournamentManager: TournamentManagerService,
		friendStatus: FriendStatusService
	)
	{
		this.playerSockets = playerSockets
		this.playerNameToSocket = playerNameToSocket
		this.gameRoomManager = gameRoomManager
		this.quickMatch = quickMatch
		this.lobbyManager = lobbyManager
		this.tournamentManager = tournamentManager
		this.friendStatus = friendStatus
	}

	/**
	 * @brief Set managers after construction (for circular dependencies)
	 * @param lobbyManager LobbyManager instance
	 * @param tournamentManager TournamentManagerService instance
	 */
	public setManagers(
		lobbyManager: LobbyManager,
		tournamentManager: TournamentManagerService
	): void
	{
		this.lobbyManager = lobbyManager
		this.tournamentManager = tournamentManager
	}

	/**
	 * @brief Remove player from all queues and active games
	 * @param socket Player's WebSocket connection
	 * @param skipStatusBroadcast Skip broadcasting offline status
	 */
	public removePlayer(socket: WebSocket, skipStatusBroadcast: boolean = false): void
	{
		console.log(`[DISCONNECT] removePlayer called for socket`)
		const player = this.playerSockets.get(socket)

		if (!player)
		{
			this.handleOrphanedTournamentSocket(socket)
			return
		}
		const playerName = player.name

		if (playerName)
			this.playerNameToSocket.delete(playerName)
		this.quickMatch.removeFromQueue(socket)
		this.lobbyManager.handleDisconnect(socket)
		if (this.gameRoomManager.handleBattleRoyaleDisconnect(socket))
		{
			this.playerSockets.delete(socket)
			if (!skipStatusBroadcast && playerName && playerName !== 'Anonymous')
				this.friendStatus.broadcastStatus(playerName, 'offline')
			return
		}
		const gameRoom = this.gameRoomManager.findGameByPlayer(socket)

		if (gameRoom)
			this.handleGameDisconnect(socket, gameRoom, playerName, skipStatusBroadcast)
		else
			this.handleNonGameDisconnect(playerName, skipStatusBroadcast)
		this.playerSockets.delete(socket)
		if (!skipStatusBroadcast && playerName && playerName !== 'Anonymous')
			this.friendStatus.broadcastStatus(playerName, 'offline')
	}

	/**
	 * @brief Handle socket found in tournament but not in playerSockets
	 * @param socket WebSocket connection
	 */
	private handleOrphanedTournamentSocket(socket: WebSocket): void
	{
		const tournament = this.tournamentManager.findTournamentBySocket(socket)

		if (tournament && tournament.getStatus() === 'running')
		{
			const playerAlias = tournament.getPlayerAliasBySocket(socket)

			if (playerAlias)
			{
				console.log(`[DISCONNECT] Player ${playerAlias} disconnected ` +
					`during tournament (found by socket only)`)
				tournament.eliminatePlayer(playerAlias)
			}
		}
	}

	/**
	 * @brief Handle disconnect when player is in a game room
	 * @param socket Player's WebSocket
	 * @param gameRoom Active game room
	 * @param playerName Player's name
	 * @param skipStatusBroadcast Skip broadcasting offline status
	 */
	private handleGameDisconnect(
		socket: WebSocket, gameRoom: any,
		playerName: string, skipStatusBroadcast: boolean
	): void
	{
		const isPlayer1 = gameRoom.player1.socket === socket
		const opponent = isPlayer1 ? gameRoom.player2 : gameRoom.player1
		const disconnectedPlayer = isPlayer1 ? gameRoom.player1 : gameRoom.player2

		if (gameRoom.tournamentMatch)
			this.handleTournamentDisconnect(gameRoom, isPlayer1, opponent,
				disconnectedPlayer)
		else
			this.handleRegularDisconnect(gameRoom, opponent)
	}

	/**
	 * @brief Handle tournament match disconnect
	 * @param gameRoom Game room with tournament match
	 * @param isPlayer1 Whether disconnecting player is player 1
	 * @param opponent Opponent player
	 * @param disconnectedPlayer Player who disconnected
	 */
	private handleTournamentDisconnect(
		gameRoom: any, isPlayer1: boolean,
		opponent: any, disconnectedPlayer: any
	): void
	{
		console.log(`[DISCONNECT] Player ${disconnectedPlayer.name} disconnected ` +
			`from tournament match, ${opponent.name} wins by forfeit`)
		const gameState = gameRoom.gameService.getGameState()
		const p1 = gameState.players[0]!
		const p2 = gameState.players[1]!
		const winner = isPlayer1 ? 'player2' : 'player1'
		const isFinalMatch = gameRoom.tournamentMatch.isFinalMatch
		const tournament = this.tournamentManager
			.findTournamentOfPlayer(disconnectedPlayer.name)

		if (tournament)
			tournament.eliminatePlayer(disconnectedPlayer.name)
		if (opponent.socket && opponent.id !== 'AI')
		{
			sendMessage(opponent.socket, {
				type: 'gameOver', winner,
				lives1: p1.lives, lives2: p2.lives,
				isTournament: true, shouldDisconnect: isFinalMatch, forfeit: true
			})
		}
		gameRoom.tournamentMatch.onComplete(opponent.id,
			isPlayer1 ? p2.lives : p1.lives,
			isPlayer1 ? p1.lives : p2.lives)
		this.gameRoomManager.endGame(gameRoom.id)
	}

	/**
	 * @brief Handle regular (non-tournament) game disconnect
	 * @param gameRoom Game room
	 * @param opponent Opponent player
	 */
	private handleRegularDisconnect(gameRoom: any, opponent: any): void
	{
		if (opponent.socket && opponent.id !== 'AI')
			sendMessage(opponent.socket, { type: 'waiting' })
		this.gameRoomManager.endGame(gameRoom.id)
	}

	/**
	 * @brief Handle disconnect when player is not in a game room
	 * @param playerName Player's name
	 * @param skipStatusBroadcast Skip broadcasting offline status
	 */
	private handleNonGameDisconnect(
		playerName: string, skipStatusBroadcast: boolean
	): void
	{
		if (!playerName || playerName === 'Anonymous')
			return
		const tournament = this.tournamentManager.findTournamentOfPlayer(playerName)

		console.log(`[DISCONNECT] Player ${playerName} not in gameRoom, ` +
			`checking tournament: ${tournament ? 'FOUND' : 'NOT FOUND'}`)
		if (tournament && tournament.getStatus() === 'running')
		{
			console.log(`[DISCONNECT] Player ${playerName} disconnected ` +
				`during tournament (countdown/waiting)`)
			tournament.eliminatePlayer(playerName)
		}
	}

	/**
	 * @brief Handle player surrender/abandon during a game
	 * @param socket Player's WebSocket connection
	 */
	public handleSurrender(socket: WebSocket): void
	{
		const player = this.playerSockets.get(socket)

		if (!player)
			return
		const playerName = player.name

		if (this.gameRoomManager.handleBattleRoyaleDisconnect(socket, true))
		{
			console.log(`[SURRENDER] Player ${playerName} surrendered from BR`)
			if (playerName && playerName !== 'Anonymous')
				this.friendStatus.broadcastStatus(playerName, 'online')
			return
		}

		const gameRoom = this.gameRoomManager.findGameByPlayer(socket)

		if (!gameRoom)
			return
		const isPlayer1 = gameRoom.player1.socket === socket
		const opponent = isPlayer1 ? gameRoom.player2 : gameRoom.player1
		const disconnectedPlayer = isPlayer1 ? gameRoom.player1 : gameRoom.player2

		console.log(`[SURRENDER] Player ${disconnectedPlayer.name} surrendered, ` +
			`${opponent.name} wins`)
		if (gameRoom.tournamentMatch)
			this.handleTournamentSurrender(socket, gameRoom, isPlayer1,
				opponent, disconnectedPlayer)
		else
			this.handleRegularSurrender(socket, gameRoom, isPlayer1,
				opponent, disconnectedPlayer)
		this.gameRoomManager.endGame(gameRoom.id)
		if (playerName && playerName !== 'Anonymous')
			this.friendStatus.broadcastStatus(playerName, 'online')
	}

	/**
	 * @brief Handle tournament match surrender
	 * @param socket Surrendering player's socket
	 * @param gameRoom Game room
	 * @param isPlayer1 Whether surrendering player is player 1
	 * @param opponent Opponent player
	 * @param surrenderingPlayer Player who surrendered
	 */
	private handleTournamentSurrender(
		socket: WebSocket, gameRoom: any, isPlayer1: boolean,
		opponent: any, surrenderingPlayer: any
	): void
	{
		const gameState = gameRoom.gameService.getGameState()
		const p1 = gameState.players[0]!
		const p2 = gameState.players[1]!
		const winner = isPlayer1 ? 'player2' : 'player1'
		const isFinalMatch = gameRoom.tournamentMatch.isFinalMatch
		const tournament = this.tournamentManager
			.findTournamentOfPlayer(surrenderingPlayer.name)

		if (tournament)
			tournament.eliminatePlayer(surrenderingPlayer.name)
		sendMessage(socket, {
			type: 'gameOver', winner,
			lives1: p1.lives, lives2: p2.lives,
			isTournament: true, shouldDisconnect: true, forfeit: true
		})
		if (opponent.socket && opponent.id !== 'AI')
		{
			sendMessage(opponent.socket, {
				type: 'gameOver', winner,
				lives1: p1.lives, lives2: p2.lives,
				isTournament: true, shouldDisconnect: isFinalMatch, forfeit: true
			})
		}
		gameRoom.tournamentMatch.onComplete(opponent.id,
			isPlayer1 ? p2.lives : p1.lives,
			isPlayer1 ? p1.lives : p2.lives)
	}

	/**
	 * @brief Handle regular (non-tournament) surrender
	 * @param socket Surrendering player's socket
	 * @param gameRoom Game room
	 * @param isPlayer1 Whether surrendering player is player 1
	 * @param opponent Opponent player
	 * @param surrenderingPlayer Player who surrendered
	 */
	private handleRegularSurrender(
		socket: WebSocket, gameRoom: any, isPlayer1: boolean,
		opponent: any, surrenderingPlayer: any
	): void
	{
		const gameState = gameRoom.gameService.getGameState()
		const p1 = gameState.players[0]!
		const p2 = gameState.players[1]!
		const winner = isPlayer1 ? 'player2' : 'player1'

		sendMessage(socket, {
			type: 'gameOver', winner,
			lives1: p1.lives, lives2: p2.lives, forfeit: true
		})
		if (opponent.socket && opponent.id !== 'AI')
		{
			sendMessage(opponent.socket, {
				type: 'gameOver', winner,
				lives1: p1.lives, lives2: p2.lives, forfeit: true
			})
		}
		if (opponent.id !== 'AI')
			this.recordForfeitResult(isPlayer1, surrenderingPlayer, opponent, p1, p2)
	}

	/**
	 * @brief Record forfeit game result to database
	 * @param isPlayer1 Whether forfeiting player is player 1
	 * @param forfeiter Player who forfeited
	 * @param winner Winning player
	 * @param p1 Player 1 game state
	 * @param p2 Player 2 game state
	 */
	private recordForfeitResult(
		isPlayer1: boolean, forfeiter: any, winner: any,
		p1: any, p2: any
	): void
	{
		try
		{
			const db = getDatabase()

			db.recordGameResult(
				forfeiter.name, '1v1', winner.name, 2,
				isPlayer1 ? p1.lives : p2.lives,
				isPlayer1 ? p2.lives : p1.lives,
				2, 'loss'
			)
			db.recordGameResult(
				winner.name, '1v1', forfeiter.name, 2,
				isPlayer1 ? p2.lives : p1.lives,
				isPlayer1 ? p1.lives : p2.lives,
				1, 'win'
			)
			console.log(`[SURRENDER] Forfeit recorded: ${forfeiter.name} vs ${winner.name}`)
		}
		catch (error)
		{
			console.error('[SURRENDER] Failed to record forfeit result:', error)
		}
	}
}
