import { WebSocket } from 'ws'
import { GameService } from './game/game.js'
import { GameState, GameInput, WebSocketMessage } from '../types.js'
import { AIPlayer } from './AIPlayer.js'
import { canvasWidth, canvasHeight } from '@app/shared/consts.js'

interface Player
{
	socket: WebSocket
	name: string
	id: string
}

interface GameRoom
{
	id: string
	player1: Player
	player2: Player
	gameService: GameService
	gameLoop: NodeJS.Timeout | null
	player1Input: { up: boolean; down: boolean; slot1?: boolean; slot2?: boolean; slot3?: boolean }
	player2Input: { up: boolean; down: boolean; slot1?: boolean; slot2?: boolean; slot3?: boolean }
	player1PrevSlots: { slot1: boolean; slot2: boolean; slot3: boolean }
	player2PrevSlots: { slot1: boolean; slot2: boolean; slot3: boolean }
	ai?: AIPlayer
	isCustom: boolean
}

/**
 * @brief Service handling player matchmaking and game room management
 */
export class MatchmakingService
{
	private waitingNormalPlayers: Player[] = []
	private waitingCustomPlayers: Player[] = []
	private activeGames: Map<string, GameRoom> = new Map()
	private playerSockets: Map<WebSocket, Player> = new Map()

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
					this.handleInput(socket, message.data)
				break
			case 'ping':
				this.sendMessage(socket, { type: 'pong' })
				break
		}
	}

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
		this.createAIGame(player, isCustom)
	}

	private createAIGame(player1: Player, isCustom: boolean): void
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
			isCustom: isCustom
		}
		room.ai!.start()
		this.activeGames.set(gameId, room)
		this.sendMessage(player1.socket, { type: 'gameStart', playerRole: 'player1' })
	}

	private addPlayer(socket: WebSocket, playerName: string, isCustom: boolean): void
	{
		const waitingQueue = isCustom ? this.waitingCustomPlayers : this.waitingNormalPlayers
		const modeStr = isCustom ? 'custom' : 'normal'

		if (this.playerSockets.has(socket))
			this.removePlayer(socket)

		const player: Player = {
			socket,
			name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		}

		this.playerSockets.set(socket, player)
		if (waitingQueue.length >= 1)
		{
			const player1 = waitingQueue.pop()!
			console.log(`[MATCHMAKING] Creating ${modeStr} game: ${player1.name} vs ${player.name}`)
			this.createGame(player1, player, isCustom)
		}
		else
		{
			waitingQueue.push(player)
			console.log(`[MATCHMAKING] ${player.name} waiting for ${modeStr} game (${waitingQueue.length}/2)`)
			this.sendMessage(socket, { type: 'waiting' })
			this.sendMessage(socket, { type: 'playerJoined', playerCount: 1 })
		}
	}

	public removePlayer(socket: WebSocket): void
	{
		const player = this.playerSockets.get(socket)
		const normalIndex = this.waitingNormalPlayers.findIndex((p: Player) => p.socket === socket)
		const customIndex = this.waitingCustomPlayers.findIndex((p: Player) => p.socket === socket)

		if (!player)
			return

		if (normalIndex > -1)
			this.waitingNormalPlayers.splice(normalIndex, 1)
		if (customIndex > -1)
			this.waitingCustomPlayers.splice(customIndex, 1)

		for (const [gameId, room] of this.activeGames.entries())
		{
			if (room.player1.socket === socket || room.player2.socket === socket)
			{
				const isPlayer1 = room.player1.socket === socket
				const opponent = isPlayer1 ? room.player2 : room.player1

				if (opponent.socket && opponent.id !== 'AI')
					this.sendMessage(opponent.socket, { type: 'waiting' })

				this.endGame(gameId)
				break
			}
		}

		this.playerSockets.delete(socket)
	}

	private handleInput(socket: WebSocket, input: GameInput): void
	{
		for (const room of this.activeGames.values())
		{
			if (room.player1.socket === socket)
			{
				room.player1Input = input.keys
				break
			}
			else if (room.player2.socket === socket)
			{
				room.player2Input = input.keys
				break
			}
		}
	}

	private createGame(player1: Player, player2: Player, isCustom: boolean): void
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
			isCustom: isCustom
		}

		this.activeGames.set(gameId, room)
		this.sendMessage(player1.socket, { type: 'gameStart', playerRole: 'player1' })
		this.sendMessage(player2.socket, { type: 'gameStart', playerRole: 'player2' })
	}

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
				this.sendMessage(room.player1.socket, { type: 'gameOver', winner: winner, score1: gameState.player1.score, score2: gameState.player2.score })
			if (room.player2.socket && room.player2.id !== 'AI')
				this.sendMessage(room.player2.socket, { type: 'gameOver', winner: winner, score1: gameState.player1.score, score2: gameState.player2.score })
			
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

	private endGame(gameId: string): void
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

	private sendMessage(socket: WebSocket, message: WebSocketMessage): void
	{
		if (socket && socket.readyState === socket.OPEN)
			socket.send(JSON.stringify(message));
	}
}
