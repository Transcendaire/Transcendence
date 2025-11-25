import { WebSocket } from 'ws'
import { WebSocketMessage } from '../../types.js'
import { Player } from './types.js'
import { GameRoomManager } from './gameRoom.js'

/**
 * @brief Handles quick 1v1 matchmaking with separate normal/custom queues
 */
export class QuickMatchService
{
	private waitingNormalPlayers: Player[] = []
	private waitingCustomPlayers: Player[] = []
	private gameRoomManager: GameRoomManager

	constructor(gameRoomManager: GameRoomManager)
	{
		this.gameRoomManager = gameRoomManager
	}

	/**
	 * @brief Add player to quick match queue
	 * @param socket Player's WebSocket
	 * @param playerName Player's name
	 * @param isCustom Join custom mode queue
	 */
	public addToQueue(socket: WebSocket, playerName: string, isCustom: boolean): void
	{
		const waitingQueue = isCustom ? this.waitingCustomPlayers : this.waitingNormalPlayers
		const modeStr = isCustom ? 'custom' : 'normal'
		const player: Player = {
			socket,
			name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		}
		if (waitingQueue.length >= 1)
		{
			const opponent = waitingQueue.pop()!
			console.log(`[QUICK_MATCH] Creating ${modeStr} game: ${opponent.name} vs ${player.name}`)
			const gameId = this.gameRoomManager.createGame(opponent, player, isCustom, 'normal', 5)
			this.sendMessage(opponent.socket, { type: 'gameStart', playerRole: 'player1' })
			this.sendMessage(player.socket, { type: 'gameStart', playerRole: 'player2' })
		}
		else
		{
			waitingQueue.push(player)
			console.log(`[QUICK_MATCH] ${player.name} waiting for ${modeStr} game (${waitingQueue.length}/2)`)
			this.sendMessage(socket, { type: 'waiting' })
			this.sendMessage(socket, { type: 'playerJoined', playerCount: 1 })
		}
	}

	/**
	 * @brief Create AI game (instant match)
	 * @param socket Player's WebSocket
	 * @param playerName Player's name
	 * @param isCustom Enable custom mode
	 * @param difficulty AI difficulty (0=easy, 1=normal, 2=hard)
	 * @param maxScore Score needed to win
	 */
	public createAIMatch(
		socket: WebSocket,
		playerName: string,
		isCustom: boolean,
		difficulty: number = 1,
		maxScore: number = 5
	): void
	{
		const player: Player = {
			socket,
			name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		}
		const gameId = this.gameRoomManager.createAIGame(
			player, isCustom, difficulty, 'normal', maxScore
		)
		console.log(`[QUICK_MATCH] AI game created: ${gameId} (custom: ${isCustom}, difficulty: ${difficulty}, maxScore: ${maxScore})`)
		this.sendMessage(player.socket, { type: 'gameStart', playerRole: 'player1' })
	}

	/**
	 * @brief Remove player from waiting queues
	 * @param socket Player's WebSocket
	 * @returns True if player was in queue
	 */
	public removeFromQueue(socket: WebSocket): boolean
	{
		const normalIndex = this.waitingNormalPlayers.findIndex(p => p.socket === socket)
		const customIndex = this.waitingCustomPlayers.findIndex(p => p.socket === socket)
		if (normalIndex > -1)
		{
			this.waitingNormalPlayers.splice(normalIndex, 1)
			return true
		}
		if (customIndex > -1)
		{
			this.waitingCustomPlayers.splice(customIndex, 1)
			return true
		}
		return false
	}

	private sendMessage(socket: WebSocket, message: WebSocketMessage): void
	{
		if (socket && socket.readyState === socket.OPEN)
			socket.send(JSON.stringify(message))
	}
}
