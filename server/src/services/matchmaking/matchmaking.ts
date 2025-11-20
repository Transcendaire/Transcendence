import { WebSocket } from 'ws'
import { GameInput, WebSocketMessage } from '../../types.js'
import { Player } from './types.js'
import { GameRoomManager } from './gameRoom.js'
import { QuickMatchService } from './quickMatch.js'
import { LobbyManager } from './lobbyManager.js'
import { TournamentManagerService } from '../tournament/tournamentManager.js'

/**
 * @brief Main matchmaking orchestrator
 * @details Delegates to specialized services:
 * - QuickMatchService: 1v1 quick matches (normal/custom)
 * - LobbyManager: Multiplayer lobbies and tournaments (2-6 players)
 * - GameRoomManager: Active game rooms and loops
 * - TournamentManagerService: Tournament bracket management
 */
export class MatchmakingService
{
	private playerSockets: Map<WebSocket, Player> = new Map()
	private gameRoomManager: GameRoomManager
	private quickMatch: QuickMatchService
	private lobbyManager: LobbyManager
	private tournamentManager: TournamentManagerService

	constructor()
	{
		this.gameRoomManager = new GameRoomManager()
		this.quickMatch = new QuickMatchService(this.gameRoomManager)
		this.tournamentManager = new TournamentManagerService(this)
		this.lobbyManager = new LobbyManager(this.gameRoomManager, this.playerSockets, this.tournamentManager)
	}

	public getGameRoomManager(): GameRoomManager
	{
		return this.gameRoomManager
	}

	/**
	 * @brief Handle incoming WebSocket messages
	 * @param socket WebSocket connection that sent the message
	 * @param message Parsed WebSocket message
	 */
	public handleMessage(socket: WebSocket, message: WebSocketMessage): void
	{
		if (!this.playerSockets.has(socket))
		{
			const tempPlayer = {
				socket: socket,
				name: 'Anonymous',
				id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
			}
			this.playerSockets.set(socket, tempPlayer)
			console.log(`[MATCHMAKING] New socket registered: ${tempPlayer.id}`)
		}

		switch (message.type)
		{
			case 'join':
				if (message.playerName)
					this.addPlayer(socket, message.playerName, false)
				break
			case 'joinCustom':
				if (message.playerName)
					this.addPlayer(socket, message.playerName, true)
				break
			case 'joinAI':
				if (message.playerName)
					this.addAIGame(socket, message.playerName, false)
				break
			case 'joinCustomAI':
				if (message.playerName)
					this.addAIGame(socket, message.playerName, true)
				break
			case 'input':
				if (message.data)
					this.gameRoomManager.updatePlayerInput(socket, message.data.keys)
				break
			case 'ping':
				this.sendMessage(socket, { type: 'pong' })
				break
			case 'createCustomLobby':
				this.handleCreateLobby(socket, message.playerName, message.name, 
					message.lobbyType, message.settings)
				break
			case 'joinLobby':
				this.handleJoinLobby(socket, message.playerName, message.lobbyId)
				break
			case 'leaveLobby':
				this.handleLeaveLobby(socket, message.lobbyId)
				break
			case 'deleteLobby':
				this.handleDeleteLobby(socket, message.lobbyId)
				break
			case 'addBot':
				this.handleAddBot(socket, message.lobbyId)
				break
			case 'removeBot':
				this.handleRemoveBot(socket, message.lobbyId, message.botId)
				break
			case 'startLobby':
				this.handleStartLobby(socket, message.lobbyId)
				break
			case 'requestLobbyList':
				this.handleRequestLobbyList(socket)
				break
		}
	}

	/**
	 * @brief Add player to AI game queue
	 * @param socket Player's WebSocket connection
	 * @param playerName Player's name
	 * @param isCustom Whether this is a custom mode game
	 */
	private addAIGame(socket: WebSocket, playerName: string, isCustom: boolean): void
	{
		if (this.playerSockets.has(socket))
			this.removePlayer(socket)

		const player: Player = {
			socket,
			name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		}
		this.playerSockets.set(socket, player)
		this.quickMatch.createAIMatch(socket, playerName, isCustom)
	}

	/**
	 * @brief Add player to matchmaking queue
	 * @param socket Player's WebSocket connection
	 * @param playerName Player's name
	 * @param isCustom Whether this is a custom mode queue
	 */
	private addPlayer(socket: WebSocket, playerName: string, isCustom: boolean): void
	{
		if (this.playerSockets.has(socket))
			this.removePlayer(socket)

		const player: Player = {
			socket,
			name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		}
		this.playerSockets.set(socket, player)
		this.quickMatch.addToQueue(socket, playerName, isCustom)
	}

	/**
	 * @brief Remove player from all queues and active games
	 * @param socket Player's WebSocket connection
	 */
	public removePlayer(socket: WebSocket): void
	{
		const player = this.playerSockets.get(socket)
		if (!player)

			return
		this.quickMatch.removeFromQueue(socket)
		this.lobbyManager.handleDisconnect(socket)
		const gameRoom = this.gameRoomManager.findGameByPlayer(socket)
		if (gameRoom)
		{
			const isPlayer1 = gameRoom.player1.socket === socket
			const opponent = isPlayer1 ? gameRoom.player2 : gameRoom.player1

			if (opponent.socket && opponent.id !== 'AI')
				this.sendMessage(opponent.socket, { type: 'waiting' })
			this.gameRoomManager.endGame(gameRoom.id)
		}

		this.playerSockets.delete(socket)
	}

	/**
	 * @brief Handle custom lobby creation
	 * @param socket Creator's WebSocket
	 * @param name Lobby name
	 * @param lobbyType Type of lobby (tournament or multiplayergame)
	 * @param settings Game settings
	 */
	private handleCreateLobby(
		socket: WebSocket,
		playerName: string,
		name: string,
		lobbyType: 'tournament' | 'multiplayergame',
		settings: any
	): void
	{
		const player = this.playerSockets.get(socket)
		if (player)
			player.name = playerName
		const lobbyId = this.lobbyManager.createLobby(socket, playerName, 
			name, lobbyType, settings)

		if (!lobbyId)
		{
			this.sendMessage(socket, {
				type: 'lobbyError',
				message: 'Already in a lobby'
			})
			return
		}
		const lobby = this.lobbyManager.getLobby(lobbyId)

		if (lobby)
			this.sendMessage(socket, {
				type: 'lobbyCreated',
				lobbyId: lobbyId,
				lobby: lobby
			})
	}

	/**
	 * @brief Handle joining a lobby
	 * @param socket Player's WebSocket
	 * @param playerName Player's name
	 * @param lobbyId Target lobby ID
	 */
	private handleJoinLobby(socket: WebSocket, playerName: string, lobbyId: string): void
	{
		const player = this.playerSockets.get(socket)
		if (player)
			player.name = playerName
		const error = this.lobbyManager.joinLobby(socket, playerName, lobbyId)

		if (error)
			this.sendMessage(socket, { type: 'lobbyError', message: error })
	}

	/**
	 * @brief Handle leaving a lobby
	 * @param socket Player's WebSocket
	 * @param lobbyId Lobby ID to leave
	 */
	private handleLeaveLobby(socket: WebSocket, lobbyId: string): void
	{
		const success = this.lobbyManager.leaveLobby(socket)

		if (!success)
			this.sendMessage(socket, {
				type: 'lobbyError',
				message: 'Not in a lobby'
			})
	}

	/**
	 * @brief Handle deleting a lobby
	 * @param socket Owner's WebSocket
	 * @param lobbyId Lobby ID to delete
	 */
	private handleDeleteLobby(socket: WebSocket, lobbyId: string): void
	{
		const error = this.lobbyManager.deleteLobby(socket, lobbyId)
		if (error)
			this.sendMessage(socket, {
				type: 'lobbyError',
				message: error
			})
	}

	/**
	 * @brief Handle adding bot to lobby
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 */
	private handleAddBot(socket: WebSocket, lobbyId: string): void
	{
		const error = this.lobbyManager.addBot(socket, lobbyId)
		if (error)
			this.sendMessage(socket, { type: 'lobbyError', message: error })
	}

	/**
	 * @brief Handle removing bot from lobby
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 * @param botId Bot ID to remove
	 */
	private handleRemoveBot(
		socket: WebSocket,
		lobbyId: string,
		botId: string
	): void
	{
		const error = this.lobbyManager.removeBot(socket, lobbyId, botId)
		if (error)
			this.sendMessage(socket, { type: 'lobbyError', message: error })
	}

	/**
	 * @brief Handle starting a lobby game
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 */
	private handleStartLobby(socket: WebSocket, lobbyId: string): void
	{
		const error = this.lobbyManager.startLobby(socket, lobbyId)
		if (error)
			this.sendMessage(socket, { type: 'lobbyError', message: error })
	}

	/**
	 * @brief Handle request for lobby list
	 * @param socket Requester's WebSocket
	 */
	private handleRequestLobbyList(socket: WebSocket): void
	{
		const lobbies = this.lobbyManager.getOpenLobbies()

		this.sendMessage(socket, { type: 'lobbyList', lobbies: lobbies })
	}

	/**
	 * @brief Send message to WebSocket client
	 * @param socket Target WebSocket connection
	 * @param message Message to send
	 */
	private sendMessage(socket: WebSocket, message: WebSocketMessage): void
	{
		if (socket && socket.readyState === socket.OPEN)
			socket.send(JSON.stringify(message))
	}
}
