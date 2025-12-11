import { WebSocket } from 'ws'
import { WebSocketMessage } from '../../types.js'
import { Player } from './core/types.js'
import { GameRoomManager } from './game/gameRoomManager.js'
import { QuickMatchService } from './core/quickMatch.js'
import { LobbyManager } from './lobby/lobbyManager.js'
import { TournamentManagerService } from '../tournament/tournamentManager.js'
import { FriendStatusService } from '../friends/FriendStatusService.js'
import { PlayerConnectionManager } from './core/playerConnectionManager.js'
import { MessageRouter } from './core/messageRouter.js'
import { LobbyHandlers } from './lobby/lobbyHandlers.js'
import { DisconnectHandler } from './core/disconnectHandler.js'

/**
 * @brief Main matchmaking orchestrator facade
 * @details Delegates to specialized services:
 * - PlayerConnectionManager: Connection/session management
 * - MessageRouter: WebSocket message routing
 * - LobbyHandlers: Lobby operations
 * - DisconnectHandler: Player disconnect/surrender handling
 * - QuickMatchService: 1v1 quick matches (normal/custom)
 * - LobbyManager: Multiplayer lobbies and tournaments (2-16 players)
 * - GameRoomManager: Active game rooms and loops
 * - TournamentManagerService: Tournament bracket management
 */
export class MatchmakingService
{
	private playerSockets: Map<WebSocket, Player> = new Map()
	private playerNameToSocket: Map<string, WebSocket> = new Map()
	private gameRoomManager: GameRoomManager
	private quickMatch: QuickMatchService
	private lobbyManager!: LobbyManager
	private tournamentManager: TournamentManagerService
	private friendStatus: FriendStatusService
	private connectionManager!: PlayerConnectionManager
	private messageRouter!: MessageRouter
	private lobbyHandlers!: LobbyHandlers
	private disconnectHandler!: DisconnectHandler

	constructor()
	{
		this.gameRoomManager = new GameRoomManager()
		this.friendStatus = new FriendStatusService(
			this.playerNameToSocket,
			(name) => this.connectionManager.isPlayerNameInActiveGame(name)
		)
		this.gameRoomManager.setStatusCallback((name, status) => {
			this.friendStatus.broadcastStatus(name, status)
		})
		this.quickMatch = new QuickMatchService(this.gameRoomManager)
		this.tournamentManager = new TournamentManagerService(this)
		this.initializeManagers()
	}

	/**
	 * @brief Initialize all manager instances with proper dependencies
	 */
	private initializeManagers(): void
	{
		this.lobbyManager = new LobbyManager(this.gameRoomManager,
			this.playerSockets, this.tournamentManager)
		this.connectionManager = new PlayerConnectionManager(
			this.playerSockets, this.playerNameToSocket,
			this.gameRoomManager, this.lobbyManager,
			this.tournamentManager, this.friendStatus
		)
		this.lobbyHandlers = new LobbyHandlers(
			this.lobbyManager, this.playerSockets,
			(name) => this.connectionManager.isPlayerNameInActiveGame(name),
			(socket) => this.connectionManager.validateSession(socket)
		)
		this.disconnectHandler = new DisconnectHandler(
			this.playerSockets, this.playerNameToSocket,
			this.gameRoomManager, this.quickMatch,
			this.lobbyManager, this.tournamentManager, this.friendStatus
		)
		this.messageRouter = new MessageRouter(
			this.gameRoomManager, this.quickMatch,
			this.lobbyHandlers, this.friendStatus, this.connectionManager,
			(socket, skip) => this.disconnectHandler.removePlayer(socket, skip),
			(socket) => this.disconnectHandler.handleSurrender(socket)
		)
	}

	/**
	 * @brief Get the game room manager instance
	 * @returns GameRoomManager instance
	 */
	public getGameRoomManager(): GameRoomManager
	{
		return this.gameRoomManager
	}

	/**
	 * @brief Register authenticated WebSocket with user credentials
	 * @param socket WebSocket connection
	 * @param userId User ID from authentication
	 * @param sessionId Session ID from cookie
	 */
	public registerAuthenticatedSocket(
		socket: WebSocket, userId: string, sessionId: string | undefined
	): void
	{
		this.connectionManager.registerAuthenticatedSocket(socket, userId, sessionId)
	}

	/**
	 * @brief Handle incoming WebSocket messages
	 * @param socket WebSocket connection that sent the message
	 * @param message Parsed WebSocket message
	 */
	public handleMessage(socket: WebSocket, message: WebSocketMessage): void
	{
		this.connectionManager.registerSocket(socket, message)
		if (this.connectionManager.checkPlayerRestrictions(socket, message))
			return
		this.messageRouter.routeMessage(socket, message)
	}

	/**
	 * @brief Remove player from all queues and active games
	 * @param socket Player's WebSocket connection
	 * @param skipStatusBroadcast Skip broadcasting offline status
	 */
	public removePlayer(socket: WebSocket, skipStatusBroadcast: boolean = false): void
	{
		this.disconnectHandler.removePlayer(socket, skipStatusBroadcast)
	}
}
