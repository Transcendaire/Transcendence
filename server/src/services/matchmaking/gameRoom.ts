import { WebSocket } from 'ws'
import { GameState, WebSocketMessage } from '../../types.js'
import { Player, GameRoom } from './types.js'
import { GameService } from '../game/game.js'
import { AIPlayer } from '../AIPlayer.js'
import { canvasWidth, canvasHeight } from '@app/shared/consts.js'

/**
 * @brief Manages active game rooms and their game loops
 */
export class GameRoomManager
{
	private activeGames: Map<string, GameRoom> = new Map()

	/**
	 * @brief Create game room for 1v1 match
	 * @param player1 First player
	 * @param player2 Second player
	 * @param isCustom Enable power-ups mode
	 * @returns Created game room ID
	 */
	public createGame(player1: Player, player2: Player, isCustom: boolean): string
	{
		const gameId = Math.random().toString(36).substr(2, 9)
		const gameService = new GameService(canvasWidth, canvasHeight, isCustom)
		const gameLoop = setInterval(() => this.updateGame(gameId), 16)
		const room: GameRoom = {
			id: gameId,
			player1,
			player2,
			gameService,
			gameLoop,
			player1Input: { up: false, down: false },
			player2Input: { up: false, down: false },
			player1PrevSlots: { slot1: false, slot2: false, slot3: false },
			player2PrevSlots: { slot1: false, slot2: false, slot3: false },
			isCustom
		}
		this.activeGames.set(gameId, room)
		return gameId
	}

	/**
	 * @brief Create AI game room
	 * @param player1 Human player
	 * @param isCustom Enable power-ups mode
	 * @returns Created game room ID
	 */
	public createAIGame(player1: Player, isCustom: boolean): string
	{
		const gameId = Math.random().toString(36).substr(2, 9)
		const gameService = new GameService(canvasWidth, canvasHeight, isCustom)
		const gameLoop = setInterval(() => this.updateGame(gameId), 16)
		const player2Input = { up: false, down: false }
		const room: GameRoom = {
			id: gameId,
			player1,
			player2: { socket: null as any, name: 'AI', id: 'AI' },
			gameService,
			gameLoop,
			player1Input: { up: false, down: false },
			player2Input: player2Input,
			player1PrevSlots: { slot1: false, slot2: false, slot3: false },
			player2PrevSlots: { slot1: false, slot2: false, slot3: false },
			ai: new AIPlayer('player2', gameService, player2Input),
			isCustom
		}
		room.ai!.start()
		this.activeGames.set(gameId, room)
		return gameId
	}

	/**
	 * @brief Update player input for a game room
	 * @param socket Player's WebSocket
	 * @param keys Input state
	 */
	public updatePlayerInput(socket: WebSocket, keys: { up: boolean; down: boolean; slot1?: boolean; slot2?: boolean; slot3?: boolean }): void
	{
		for (const room of this.activeGames.values())
		{
			if (room.player1.socket === socket)
			{
				room.player1Input = keys
				break
			}
			else if (room.player2.socket === socket)
			{
				room.player2Input = keys
				break
			}
		}
	}

	/**
	 * @brief Find game room by player socket
	 * @param socket Player's WebSocket
	 * @returns Game room or undefined
	 */
	public findGameByPlayer(socket: WebSocket): GameRoom | undefined
	{
		for (const room of this.activeGames.values())
			if (room.player1.socket === socket || room.player2.socket === socket)
				return room
		return undefined
	}

	/**
	 * @brief End game and cleanup resources
	 * @param gameId Game room ID
	 */
	public endGame(gameId: string): void
	{
		const room = this.activeGames.get(gameId)
		if (!room)
			return
		if (room.gameLoop)
			clearInterval(room.gameLoop)
		if (room.ai)
			room.ai.stop()
		this.activeGames.delete(gameId)
	}

	/**
	 * @brief Update game state and broadcast to players
	 * @param gameId Game room ID
	 */
	private updateGame(gameId: string): void
	{
		const room = this.activeGames.get(gameId)
		if (!room)
			return
		const slot1Pressed = !!(room.player1Input.slot1 && !room.player1PrevSlots.slot1)
		const slot2Pressed = !!(room.player1Input.slot2 && !room.player1PrevSlots.slot2)
		const slot3Pressed = !!(room.player1Input.slot3 && !room.player1PrevSlots.slot3)
		const p2slot1Pressed = !!(room.player2Input.slot1 && !room.player2PrevSlots.slot1)
		const p2slot2Pressed = !!(room.player2Input.slot2 && !room.player2PrevSlots.slot2)
		const p2slot3Pressed = !!(room.player2Input.slot3 && !room.player2PrevSlots.slot3)

		room.player1PrevSlots.slot1 = room.player1Input.slot1 || false
		room.player1PrevSlots.slot2 = room.player1Input.slot2 || false
		room.player1PrevSlots.slot3 = room.player1Input.slot3 || false
		room.player2PrevSlots.slot1 = room.player2Input.slot1 || false
		room.player2PrevSlots.slot2 = room.player2Input.slot2 || false
		room.player2PrevSlots.slot3 = room.player2Input.slot3 || false

		const p1Input = {
			up: room.player1Input.up,
			down: room.player1Input.down,
			...(slot1Pressed && { slot1: true }),
			...(slot2Pressed && { slot2: true }),
			...(slot3Pressed && { slot3: true })
		}
		const p2Input = {
			up: room.player2Input.up,
			down: room.player2Input.down,
			...(p2slot1Pressed && { slot1: true }),
			...(p2slot2Pressed && { slot2: true }),
			...(p2slot3Pressed && { slot3: true })
		}
		const gameOver = room.gameService.updateGame(16, p1Input, p2Input)
		if (gameOver)
		{
			const gameState = room.gameService.getGameState()
			const winner = gameState.player1.score > gameState.player2.score ? 'player1' : 'player2'
			if (room.player1.socket)
				this.sendMessage(room.player1.socket, { type: 'gameOver', winner, score1: gameState.player1.score, score2: gameState.player2.score })
			if (room.player2.socket && room.player2.id !== 'AI')
				this.sendMessage(room.player2.socket, { type: 'gameOver', winner, score1: gameState.player1.score, score2: gameState.player2.score })
			this.endGame(gameId)
			return
		}
		const gameState = room.gameService.getGameState()
		const stateMessage: GameState = {
			player1: {
				paddle: { y: gameState.player1.paddle.positionY },
				score: gameState.player1.score,
				itemSlots: gameState.player1.itemSlots,
				pendingPowerUps: gameState.player1.pendingPowerUps,
				selectedSlots: gameState.player1.selectedSlots,
				hitStreak: gameState.player1.hitStreak,
				chargingPowerUp: gameState.player1.chargingPowerUp
			},
			player2: {
				paddle: { y: gameState.player2.paddle.positionY },
				score: gameState.player2.score,
				itemSlots: gameState.player2.itemSlots,
				pendingPowerUps: gameState.player2.pendingPowerUps,
				selectedSlots: gameState.player2.selectedSlots,
				hitStreak: gameState.player2.hitStreak,
				chargingPowerUp: gameState.player2.chargingPowerUp
			},
			ball: {
				x: gameState.ball.positionX,
				y: gameState.ball.positionY,
				vx: gameState.ball.velocityX,
				vy: gameState.ball.velocityY
			},
			cloneBalls: gameState.cloneBalls.map(clone => ({
				x: clone.positionX,
				y: clone.positionY,
				vx: clone.velocityX,
				vy: clone.velocityY
			})),
			fruits: gameState.fruits
		}
		if (room.player1.socket)
			this.sendMessage(room.player1.socket, { type: 'gameState', data: stateMessage })
		if (room.player2.socket)
			this.sendMessage(room.player2.socket, { type: 'gameState', data: stateMessage })
	}

	private sendMessage(socket: WebSocket, message: WebSocketMessage): void
	{
		if (socket && socket.readyState === socket.OPEN)
			socket.send(JSON.stringify(message))
	}
}
