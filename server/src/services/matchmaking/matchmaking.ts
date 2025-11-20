import { WebSocket } from 'ws'
import { GameInput, WebSocketMessage } from '../../types.js'
import { Player } from './types.js'
import { GameRoomManager } from './gameRoom.js'
import { QuickMatchService } from './quickMatch.js'
import { LobbyManager } from './lobbyManager.js'

/**
 * @brief Main matchmaking orchestrator
 * @details Delegates to specialized services:
 * - QuickMatchService: 1v1 quick matches (normal/custom)
 * - LobbyManager: Multiplayer lobbies and tournaments (2-6 players)
 * - GameRoomManager: Active game rooms and loops
 */
export class MatchmakingService
{
	private playerSockets: Map<WebSocket, Player> = new Map()
	private gameRoomManager: GameRoomManager
	private quickMatch: QuickMatchService
	private lobbyManager: LobbyManager

	constructor()
	{
		this.gameRoomManager = new GameRoomManager()
		this.quickMatch = new QuickMatchService(this.gameRoomManager)
		this.lobbyManager = new LobbyManager()
	}

	/**
	 * @brief Handle incoming WebSocket messages
	 * @param socket WebSocket connection that sent the message
	 * @param message Parsed WebSocket message
	 */
	public handleMessage(socket: WebSocket, message: WebSocketMessage): void
	{
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
