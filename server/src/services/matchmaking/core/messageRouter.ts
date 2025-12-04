import { WebSocket } from 'ws'
import { WebSocketMessage } from '../../../types.js'
import { Player } from '../core/types.js'
import { GameRoomManager } from '../game/gameRoomManager.js'
import { QuickMatchService } from '../core/quickMatch.js'
import { LobbyHandlers } from '../lobby/lobbyHandlers.js'
import { FriendStatusService } from '../../friends/FriendStatusService.js'
import { PlayerConnectionManager } from '../core/playerConnectionManager.js'
import { sendMessage } from '../../../utils/websocket.js'

/**
 * @brief Routes WebSocket messages to appropriate handlers
 * @details Separates message routing by category: player, game, lobby, friends
 */
export class MessageRouter
{
	private gameRoomManager: GameRoomManager
	private quickMatch: QuickMatchService
	private lobbyHandlers: LobbyHandlers
	private friendStatus: FriendStatusService
	private connectionManager: PlayerConnectionManager
	private removePlayerCallback: (socket: WebSocket, skipBroadcast?: boolean) => void
	private handleSurrenderCallback: (socket: WebSocket) => void

	constructor(
		gameRoomManager: GameRoomManager, quickMatch: QuickMatchService,
		lobbyHandlers: LobbyHandlers, friendStatus: FriendStatusService,
		connectionManager: PlayerConnectionManager,
		removePlayerCallback: (socket: WebSocket, skipBroadcast?: boolean) => void,
		handleSurrenderCallback: (socket: WebSocket) => void
	)
	{
		this.gameRoomManager = gameRoomManager
		this.quickMatch = quickMatch
		this.lobbyHandlers = lobbyHandlers
		this.friendStatus = friendStatus
		this.connectionManager = connectionManager
		this.removePlayerCallback = removePlayerCallback
		this.handleSurrenderCallback = handleSurrenderCallback
	}

	/**
	 * @brief Route message to appropriate handler
	 * @param socket WebSocket connection
	 * @param message Parsed WebSocket message
	 */
	public routeMessage(socket: WebSocket, message: WebSocketMessage): void
	{
		if (this.routePlayerMessages(socket, message))
			return
		if (this.routeGameMessages(socket, message))
			return
		if (this.routeLobbyMessages(socket, message))
			return
		this.routeFriendMessages(socket, message)
	}

	/**
	 * @brief Route player-related messages (register, join, AI, cancel)
	 * @param socket WebSocket connection
	 * @param message WebSocket message
	 * @returns True if message was handled
	 */
	private routePlayerMessages(socket: WebSocket, message: WebSocketMessage): boolean
	{
		if (message.type === 'surrender')
			return this.handleSurrenderCallback(socket), true
		if (message.type === 'cancelQueue')
			return this.handleCancelQueue(socket), true
		const playerName = 'playerName' in message ? message.playerName : undefined
		if (!playerName)
			return false
	
		switch (message.type)
		{
			case 'register':
				this.connectionManager.updatePlayerName(socket, playerName)
				return true
			case 'join':
				this.handleJoin(socket, playerName, false)
				return true
			case 'joinCustom':
				this.handleJoin(socket, playerName, true)
				return true
			case 'joinAI':
				this.handleJoinAI(socket, playerName, message.enablePowerUps ?? false,
					message.difficulty ?? 1, message.lifeCount ?? 5)
				return true
			case 'forceDisconnect':
				this.connectionManager.handleForceDisconnect(
					socket, playerName, this.removePlayerCallback)
				return true
		}
		return false
	}

	/**
	 * @brief Route game-related messages (input, ping)
	 * @param socket WebSocket connection
	 * @param message WebSocket message
	 * @returns True if message was handled
	 */
	private routeGameMessages(socket: WebSocket, message: WebSocketMessage): boolean
	{
		switch (message.type)
		{
			case 'input':
				if (message.data)
					this.gameRoomManager.updatePlayerInput(socket, message.data.keys)
				return true
			case 'ping':
				this.gameRoomManager.handlePing(socket, message.pingValue ?? 0)
				sendMessage(socket, { type: 'pong' })
				return true
		}
		return false
	}

	/**
	 * @brief Route lobby-related messages
	 * @param socket WebSocket connection
	 * @param message WebSocket message
	 * @returns True if message was handled
	 */
	private routeLobbyMessages(socket: WebSocket, message: WebSocketMessage): boolean
	{
		switch (message.type)
		{
			case 'createCustomLobby':
				if ('playerName' in message && message.playerName)
					this.lobbyHandlers.handleCreateLobby(socket, message.playerName,
						message.name, message.lobbyType, message.maxPlayers, message.settings)
				return true
			case 'joinLobby':
				if ('playerName' in message && message.playerName)
					this.lobbyHandlers.handleJoinLobby(socket, message.playerName, message.lobbyId)
				return true
			case 'leaveLobby':
				this.lobbyHandlers.handleLeaveLobby(socket, message.lobbyId)
				return true
			case 'deleteLobby':
				this.lobbyHandlers.handleDeleteLobby(socket, message.lobbyId)
				return true
			case 'addBot':
				this.lobbyHandlers.handleAddBot(socket, message.lobbyId)
				return true
			case 'removeBot':
				this.lobbyHandlers.handleRemoveBot(socket, message.lobbyId, message.botId)
				return true
			case 'startLobby':
				this.lobbyHandlers.handleStartLobby(socket, message.lobbyId)
				return true
			case 'requestLobbyList':
				this.lobbyHandlers.handleRequestLobbyList(socket)
				return true
		}
		return false
	}

	/**
	 * @brief Route friend-related messages
	 * @param socket WebSocket connection
	 * @param message WebSocket message
	 */
	private routeFriendMessages(socket: WebSocket, message: WebSocketMessage): void
	{
		const playerName = 'playerName' in message ? message.playerName : undefined

		if (!playerName)
			return
		switch (message.type)
		{
			case 'requestFriendList':
				this.connectionManager.updatePlayerName(socket, playerName)
				sendMessage(socket, {
					type: 'friendList',
					friends: this.friendStatus.getFriendList(playerName)
				})
				break
			case 'requestOnlinePlayers':
				this.connectionManager.updatePlayerName(socket, playerName)
				sendMessage(socket, {
					type: 'onlinePlayersList',
					players: this.friendStatus.getOnlinePlayersList(playerName)
				})
				break
		}
	}

	/**
	 * @brief Add player to matchmaking queue
	 * @param socket Player's WebSocket connection
	 * @param playerName Player's name
	 * @param isCustom Whether this is a custom mode queue
	 */
	private handleJoin(socket: WebSocket, playerName: string, isCustom: boolean): void
	{
		if (this.connectionManager.hasPlayer(socket))
			this.removePlayerCallback(socket, true)
		const player: Player = {
			socket, name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		}

		this.connectionManager.setPlayer(socket, player)
		this.friendStatus.broadcastStatus(playerName, 'online')
		this.quickMatch.addToQueue(socket, playerName, isCustom)
	}

	/**
	 * @brief Add player to AI game queue
	 * @param socket Player's WebSocket connection
	 * @param playerName Player's name
	 * @param isCustom Whether this is a custom mode game
	 * @param difficulty AI difficulty (0=easy, 1=normal, 2=hard)
	 * @param lifeCount Lives count for the game
	 */
	private handleJoinAI(socket: WebSocket, playerName: string, isCustom: boolean,
		difficulty: number, lifeCount: number): void
	{
		if (this.connectionManager.hasPlayer(socket))
			this.removePlayerCallback(socket, true)
		const player: Player = {
			socket, name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		}

		this.connectionManager.setPlayer(socket, player)
		this.friendStatus.broadcastStatus(playerName, 'online')
		this.quickMatch.createAIMatch(socket, playerName, isCustom, difficulty, lifeCount)
	}

	/**
	 * @brief Handle player cancelling matchmaking queue search
	 * @param socket Player's WebSocket connection
	 */
	private handleCancelQueue(socket: WebSocket): void
	{
		const player = this.connectionManager.getPlayer(socket)
		if (!player)
			return
		console.log(`[ROUTER] Player ${player.name} cancelled queue search`)
		this.quickMatch.removeFromQueue(socket)
	}
}
