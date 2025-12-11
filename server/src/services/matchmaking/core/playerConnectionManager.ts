import { WebSocket } from 'ws'
import { WebSocketMessage } from '../../../types.js'
import { Player } from './types.js'
import { GameRoomManager } from '../game/gameRoomManager.js'
import { LobbyManager } from '../lobby/lobbyManager.js'
import { TournamentManagerService } from '../../tournament/tournamentManager.js'
import { FriendStatusService } from '../../friends/FriendStatusService.js'
import { sendMessage } from '../../../utils/websocket.js'
import { getDatabase } from '../../../db/databaseSingleton.js'

/**
 * @brief Manages player WebSocket connections and session state
 * @details Handles registration, duplicate detection, force disconnect,
 *          player name updates, session validation, and restriction checks
 */
export class PlayerConnectionManager
{
	private playerSockets: Map<WebSocket, Player>
	private playerNameToSocket: Map<string, WebSocket>
	private gameRoomManager: GameRoomManager
	private lobbyManager: LobbyManager
	private tournamentManager: TournamentManagerService
	private friendStatus: FriendStatusService

	constructor(
		playerSockets: Map<WebSocket, Player>,
		playerNameToSocket: Map<string, WebSocket>,
		gameRoomManager: GameRoomManager,
		lobbyManager: LobbyManager,
		tournamentManager: TournamentManagerService,
		friendStatus: FriendStatusService
	)
	{
		this.playerSockets = playerSockets
		this.playerNameToSocket = playerNameToSocket
		this.gameRoomManager = gameRoomManager
		this.lobbyManager = lobbyManager
		this.tournamentManager = tournamentManager
		this.friendStatus = friendStatus
	}

	/**
	 * @brief Set references after construction (for circular dependencies)
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
	 * @brief Check if player name is already connected
	 * @param socket New socket trying to connect
	 * @param playerName Player name to check
	 * @returns True if duplicate found (message sent), false if OK to proceed
	 */
	public checkDuplicateConnection(socket: WebSocket, playerName: string): boolean
	{
		const existingSocket = this.playerNameToSocket.get(playerName)

		if (existingSocket && existingSocket !== socket
			&& existingSocket.readyState === existingSocket.OPEN)
		{
			console.log(`[CONNECTION] Duplicate connection attempt for ${playerName}`)
			sendMessage(socket, { type: 'alreadyConnected', playerName })
			return true
		}
		return false
	}

	/**
	 * @brief Force disconnect existing session and connect new one
	 * @param newSocket New socket requesting connection
	 * @param playerName Player name
	 * @param removePlayerCallback Callback to remove player from matchmaking
	 */
	public handleForceDisconnect(
		newSocket: WebSocket,
		playerName: string,
		removePlayerCallback: (socket: WebSocket) => void
	): void
	{
		const lobbySocket = this.lobbyManager.getSocketByPlayerName(playerName)

		if (lobbySocket && lobbySocket !== newSocket)
		{
			console.log(`[CONNECTION] Force disconnecting lobby session: ${playerName}`)
			sendMessage(lobbySocket, { type: 'disconnectedByOtherSession' })
			this.lobbyManager.removePlayerByName(playerName)
			lobbySocket.close()
		}

		const gameSocket = this.gameRoomManager.getSocketByPlayerName(playerName)

		if (gameSocket && gameSocket !== newSocket && gameSocket !== lobbySocket)
		{
			console.log(`[CONNECTION] Force disconnecting game session: ${playerName}`)
			sendMessage(gameSocket, { type: 'disconnectedByOtherSession' })
			removePlayerCallback(gameSocket)
			gameSocket.close()
		}

		const existingSocket = this.playerNameToSocket.get(playerName)

		if (existingSocket && existingSocket !== newSocket
			&& existingSocket !== lobbySocket && existingSocket !== gameSocket)
		{
			console.log(`[CONNECTION] Force disconnecting existing session: ${playerName}`)
			sendMessage(existingSocket, { type: 'disconnectedByOtherSession' })
			removePlayerCallback(existingSocket)
			existingSocket.close()
		}
		this.playerNameToSocket.set(playerName, newSocket)
	}

	/**
	 * @brief Check if player name is in an active game, BR, or tournament
	 * @param playerName Player's name to check
	 * @returns True if player name is in any active game
	 */
	public isPlayerNameInActiveGame(playerName: string): boolean
	{
		const inGame = this.gameRoomManager.isPlayerNameInGame(playerName)
		const inBR = this.gameRoomManager.isPlayerNameInBattleRoyale(playerName)
		const inTournament = this.tournamentManager.isPlayerNameInActiveTournament(playerName)

		return inGame || inBR || inTournament
	}

	/**
	 * @brief Register new socket with temporary player data
	 * @param socket WebSocket connection
	 * @param message Message containing optional playerName
	 */
	public registerSocket(socket: WebSocket, message: WebSocketMessage): void
	{
		const existingPlayer = this.playerSockets.get(socket)

		if (existingPlayer)
		{
			if ('playerName' in message && message.playerName
				&& existingPlayer.name === 'Anonymous')
			{
				existingPlayer.name = message.playerName
				this.playerNameToSocket.set(message.playerName, socket)
				this.friendStatus.broadcastStatus(message.playerName, 'online')
			}
			return
		}
		const name = 'playerName' in message && message.playerName
			? message.playerName : 'Anonymous'
		const tempPlayer: Player = {
			socket,
			name,
			id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
		}

		this.playerSockets.set(socket, tempPlayer)
		this.playerNameToSocket.set(name, socket)
		console.log(`[CONNECTION] New socket registered: ${tempPlayer.id} (${name})`)
		if (name !== 'Anonymous')
			this.friendStatus.broadcastStatus(name, 'online')
	}

	/**
	 * @brief Check if player can perform action (not duplicate, not in lobby/game)
	 * @param socket WebSocket connection
	 * @param message Message with playerName
	 * @returns True if action is blocked, false if OK to proceed
	 */
	public checkPlayerRestrictions(socket: WebSocket, message: WebSocketMessage): boolean
	{
		const actionTypes = ['join', 'joinCustom', 'joinAI', 'createCustomLobby', 'joinLobby']

		if (!('playerName' in message) || !message.playerName
			|| !actionTypes.includes(message.type))
			return false
		const playerName = message.playerName

		if (this.checkDuplicateConnection(socket, playerName))
			return true
		if (this.lobbyManager.isPlayerNameInAnyLobby(playerName))
			return sendMessage(socket, { type: 'alreadyInLobby', playerName }), true
		if (this.isPlayerNameInActiveGame(playerName))
			return sendMessage(socket, { type: 'alreadyInGame', playerName }), true
		return false
	}

	/**
	 * @brief Update player name for socket and broadcast if changed from Anonymous
	 * @param socket WebSocket connection
	 * @param playerName New player name
	 */
	public updatePlayerName(socket: WebSocket, playerName: string): void
	{
		if (!playerName || playerName === 'Anonymous')
			return
		const player = this.playerSockets.get(socket)

		if (!player)
			return
		const oldName = player.name

		if (oldName === playerName)
			return
		if (oldName && oldName !== 'Anonymous')
			this.playerNameToSocket.delete(oldName)
		player.name = playerName
		this.playerNameToSocket.set(playerName, socket)
		this.friendStatus.broadcastStatus(playerName, 'online')
	}

	/**
	 * @brief Get player by socket
	 * @param socket WebSocket connection
	 * @returns Player or undefined
	 */
	public getPlayer(socket: WebSocket): Player | undefined
	{
		return this.playerSockets.get(socket)
	}

	/**
	 * @brief Check if socket is registered
	 * @param socket WebSocket connection
	 * @returns True if socket has player data
	 */
	public hasPlayer(socket: WebSocket): boolean
	{
		return this.playerSockets.has(socket)
	}

	/**
	 * @brief Delete player socket mapping
	 * @param socket WebSocket connection
	 */
	public deletePlayer(socket: WebSocket): void
	{
		this.playerSockets.delete(socket)
	}

	/**
	 * @brief Delete player name mapping
	 * @param playerName Player name
	 */
	public deletePlayerName(playerName: string): void
	{
		this.playerNameToSocket.delete(playerName)
	}

	/**
	 * @brief Set player socket mapping
	 * @param socket WebSocket connection
	 * @param player Player data
	 */
	public setPlayer(socket: WebSocket, player: Player): void
	{
		this.playerSockets.set(socket, player)
		this.playerNameToSocket.set(player.name, socket)
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
		const tempPlayer: Player = {
			socket,
			name: 'Anonymous',
			id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			userId
		}

		if (sessionId)
			tempPlayer.sessionId = sessionId
		this.playerSockets.set(socket, tempPlayer)
		console.log(`[CONNECTION] Authenticated socket registered: ${userId}`)
	}

	/**
	 * @brief Validate if session is still valid for a socket
	 * @param socket WebSocket connection to validate
	 * @returns True if session is valid, false otherwise
	 */
	public validateSession(socket: WebSocket): boolean
	{
		const player = this.playerSockets.get(socket)

		if (!player || !player.sessionId)
		{
			console.log(`[SESSION] No session for socket, player: ${player?.name}`)
			sendMessage(socket, { type: 'sessionExpired' })
			socket.close(1008, 'Session expired')
			return false
		}
		const db = getDatabase()
		const user = db.getUserBySessionId(player.sessionId)

		if (!user || user.id !== player.userId)
		{
			console.log(`[SESSION] Invalid session for user: ${player.userId}`)
			sendMessage(socket, { type: 'sessionExpired' })
			socket.close(1008, 'Session expired')
			return false
		}
		return true
	}
}
