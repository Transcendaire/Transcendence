import { WebSocket } from 'ws'
import { GameState, PlayerOnlineStatus } from '../../../types.js'
import { Player, GameRoom } from '../core/types.js'
import { GameService, PlayerInput } from '../../game/game.js'
import { Player as GamePlayer } from '@app/shared/models/Player.js'
import { CloneBall } from '@app/shared/models/CloneBall.js'
import { AIPlayer } from '../../aiplayer/AIPlayer.js'
import { EasyAIPlayer } from '../../aiplayer/EasyAIPlayer.js'
import { NormalAIPlayer } from '../../aiplayer/NormalAIPlayer.js'
import { canvasWidth, canvasHeight } from '@app/shared/consts.js'
import { getDatabase } from '../../../db/databaseSingleton.js'
import { sendGameOver, sendGameState, GameOverOptions } from './gameMessages.js'

type StatusCallback = (playerName: string, status: PlayerOnlineStatus) => void

interface SlotPressState { slot1: boolean; slot2: boolean; slot3: boolean }

/**
 * @brief Manages 1v1 game rooms and their game loops
 */
export class ClassicGameManager
{
	private activeGames: Map<string, GameRoom> = new Map()
	private onStatusChange?: StatusCallback

	public setStatusCallback(callback: StatusCallback): void
	{
		this.onStatusChange = callback
	}

	/**
	 * @brief Create game room for 1v1 match
	 */
	public createGame(
		player1: Player, player2: Player, isCustom: boolean,
		fruitFrequency: 'low' | 'normal' | 'high' = 'normal', lifeCount: number = 5,
		tournamentMatch?: {
			tournamentId: string
			matchId: string
			isFinalMatch: boolean
			onComplete: (winnerId: string, lives1: number, lives2: number) => void
			onUpdate?: () => void
		}
	): string
	{
		const gameId = Math.random().toString(36).substr(2, 9)
		const gameService = new GameService(
			canvasWidth, canvasHeight, isCustom, fruitFrequency, lifeCount, 2,
			[player1.name, player2.name]
		)
		const gameLoop = setInterval(() => this.updateGame(gameId), 16)
		const room: GameRoom = {
			id: gameId, player1, player2, gameService, gameLoop,
			player1Input: { up: false, down: false },
			player2Input: { up: false, down: false },
			player1PrevSlots: { slot1: false, slot2: false, slot3: false },
			player2PrevSlots: { slot1: false, slot2: false, slot3: false },
			player1Ping: 0, player2Ping: 0, isCustom,
			...(tournamentMatch && { tournamentMatch })
		}
		this.activeGames.set(gameId, room)
		this.onStatusChange?.(player1.name, 'in-game')
		if (player2.id !== 'AI')
			this.onStatusChange?.(player2.name, 'in-game')
		return gameId
	}

	/**
	 * @brief Create AI game room
	 */
	public createAIGame(
		player1: Player, isCustom: boolean, difficulty: number = 1,
		fruitFrequency: 'low' | 'normal' | 'high' = 'normal',
		lifeCount: number = 5, aiName: string = 'XavierNiel'
	): string
	{
		const gameId = Math.random().toString(36).substr(2, 9)
		const gameService = new GameService(
			canvasWidth, canvasHeight, isCustom, fruitFrequency, lifeCount, 2,
			[player1.name, aiName]
		)
		const gameLoop = setInterval(() => this.updateGame(gameId), 16)
		const player2Input = { up: false, down: false }
		const aiPlayer = this.createAIPlayer(difficulty, gameService, player2Input)
		const room: GameRoom = {
			id: gameId, player1,
			player2: { socket: null as any, name: aiName, id: 'AI' },
			gameService, gameLoop,
			player1Input: { up: false, down: false }, player2Input,
			player1PrevSlots: { slot1: false, slot2: false, slot3: false },
			player2PrevSlots: { slot1: false, slot2: false, slot3: false },
			player1Ping: 0, player2Ping: 0, ai: aiPlayer, isCustom
		}
		room.ai!.start()
		this.activeGames.set(gameId, room)
		this.onStatusChange?.(player1.name, 'in-game')
		return gameId
	}

	/**
	 * @brief Instantiate AI player based on difficulty
	 */
	private createAIPlayer(
		difficulty: number, gameService: GameService,
		inputState: { up: boolean; down: boolean }
	): AIPlayer
	{
		switch (difficulty)
		{
			case 0:
				return new EasyAIPlayer('player2', gameService, inputState)
			case 1:
			default:
				return new NormalAIPlayer('player2', gameService, inputState)
		}
	}

	/**
	 * @brief Update game state and broadcast to players
	 */
	private updateGame(gameId: string): void
	{
		const room = this.activeGames.get(gameId)
		if (!room)
			return
		const inputs = this.collectInputs(room)
		const gameOver = room.gameService.updateGame(16, inputs)
		if (gameOver)
			return this.handleGameOver(room, gameId)
		this.broadcastState(room)
	}

	/**
	 * @brief Collect and process player inputs
	 */
	private collectInputs(room: GameRoom): PlayerInput[]
	{
		const p1Slots = this.detectSlotPresses(room.player1Input, room.player1PrevSlots)
		const p2Slots = this.detectSlotPresses(room.player2Input, room.player2PrevSlots)
		this.updatePrevSlots(room.player1Input, room.player1PrevSlots)
		this.updatePrevSlots(room.player2Input, room.player2PrevSlots)
		return [
			{
				up: room.player1Input.up, down: room.player1Input.down,
				...(p1Slots.slot1 && { slot1: true }),
				...(p1Slots.slot2 && { slot2: true }),
				...(p1Slots.slot3 && { slot3: true })
			},
			{
				up: room.player2Input.up, down: room.player2Input.down,
				...(p2Slots.slot1 && { slot1: true }),
				...(p2Slots.slot2 && { slot2: true }),
				...(p2Slots.slot3 && { slot3: true })
			}
		]
	}

	/**
	 * @brief Detect which slots were just pressed
	 */
	private detectSlotPresses(
		input: { slot1?: boolean; slot2?: boolean; slot3?: boolean },
		prevSlots: SlotPressState
	): SlotPressState
	{
		return {
			slot1: !!(input.slot1 && !prevSlots.slot1),
			slot2: !!(input.slot2 && !prevSlots.slot2),
			slot3: !!(input.slot3 && !prevSlots.slot3)
		}
	}

	/**
	 * @brief Update previous slot states
	 */
	private updatePrevSlots(
		input: { slot1?: boolean; slot2?: boolean; slot3?: boolean },
		prevSlots: SlotPressState
	): void
	{
		prevSlots.slot1 = input.slot1 || false
		prevSlots.slot2 = input.slot2 || false
		prevSlots.slot3 = input.slot3 || false
	}

	/**
	 * @brief Handle game over logic
	 */
	private handleGameOver(room: GameRoom, gameId: string): void
	{
		const gameState = room.gameService.getGameState()
		const p1 = gameState.players[0]!
		const p2 = gameState.players[1]!
		const winner = p1.lives > p2.lives ? 'player1' : 'player2'
		const winnerId = winner === 'player1' ? room.player1.id : room.player2.id
		const isTournament = !!room.tournamentMatch
		const isFinalMatch = room.tournamentMatch?.isFinalMatch ?? false
		this.sendGameOverToPlayers(room, winner, p1.lives, p2.lives, isTournament, isFinalMatch)
		if (room.tournamentMatch)
			this.completeTournamentMatch(room.tournamentMatch, winnerId, p1.lives, p2.lives)
		else if (room.player2.id !== 'AI')
			this.recordQuickmatchResult(room, winner, p1.lives, p2.lives)
		this.endGame(gameId)
	}

	/**
	 * @brief Send game over messages to both players
	 */
	private sendGameOverToPlayers(
		room: GameRoom, winner: 'player1' | 'player2',
		lives1: number, lives2: number, isTournament: boolean, isFinalMatch: boolean
	): void
	{
		const p1Options: GameOverOptions = {
			winner, lives1, lives2, isTournament,
			shouldDisconnect: isFinalMatch || !isTournament || winner !== 'player1'
		}
		const p2Options: GameOverOptions = {
			winner, lives1, lives2, isTournament,
			shouldDisconnect: isFinalMatch || !isTournament || winner !== 'player2'
		}
		sendGameOver(room.player1.socket, p1Options)
		if (room.player2.id !== 'AI')
			sendGameOver(room.player2.socket, p2Options)
	}

	/**
	 * @brief Complete tournament match callback
	 */
	private completeTournamentMatch(
		match: NonNullable<GameRoom['tournamentMatch']>,
		winnerId: string, lives1: number, lives2: number
	): void
	{
		console.log(`[GAME_ROOM] Tournament match completed: ${match.matchId}`)
		match.onComplete(winnerId, lives1, lives2)
	}

	/**
	 * @brief Record quickmatch result to database
	 */
	private recordQuickmatchResult(
		room: GameRoom, winner: 'player1' | 'player2', lives1: number, lives2: number
	): void
	{
		try
		{
			const db = getDatabase()
			db.recordGameResult(
				room.player1.name, '1v1', room.player2.name, 2,
				lives1, lives2, winner === 'player1' ? 1 : 2, winner === 'player1' ? 'win' : 'loss'
			)
			db.recordGameResult(
				room.player2.name, '1v1', room.player1.name, 2,
				lives2, lives1, winner === 'player2' ? 1 : 2, winner === 'player2' ? 'win' : 'loss'
			)
			console.log(`[GAME_ROOM] Quickmatch recorded: ${room.player1.name} vs ${room.player2.name}`)
		}
		catch (error)
		{
			console.error('[GAME_ROOM] Failed to record quickmatch result:', error)
		}
	}

	/**
	 * @brief Broadcast game state to players
	 */
	private broadcastState(room: GameRoom): void
	{
		const stateMessage = this.buildStateMessage(room)
		sendGameState(room.player1.socket, stateMessage)
		sendGameState(room.player2.socket, stateMessage)
		if (room.tournamentMatch?.onUpdate)
			room.tournamentMatch.onUpdate()
	}

	/**
	 * @brief Build game state message for broadcast
	 */
	private buildStateMessage(room: GameRoom): GameState
	{
		const gameState = room.gameService.getGameState()
		return {
			players: gameState.players.map((p: GamePlayer, index: number) => ({
				paddle: { y: p.paddle.positionY },
				lives: p.lives, isEliminated: p.isEliminated(), name: p.name,
				ping: index === 0 ? room.player1Ping : room.player2Ping,
				itemSlots: p.itemSlots, pendingPowerUps: p.pendingPowerUps,
				selectedSlots: p.selectedSlots, hitStreak: p.hitStreak,
				chargingPowerUp: p.chargingPowerUp
			})),
			ball: {
				x: gameState.ball.positionX, y: gameState.ball.positionY,
				vx: gameState.ball.velocityX, vy: gameState.ball.velocityY
			},
			cloneBalls: gameState.cloneBalls.map((clone: CloneBall) => ({
				x: clone.positionX, y: clone.positionY,
				vx: clone.velocityX, vy: clone.velocityY
			})),
			fruits: gameState.fruits
		}
	}

	/**
	 * @brief End game and cleanup resources
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
		this.onStatusChange?.(room.player1.name, 'online')
		if (room.player2.id !== 'AI')
			this.onStatusChange?.(room.player2.name, 'online')
		this.activeGames.delete(gameId)
	}

	/**
	 * @brief Find game room by player socket
	 */
	public findGameByPlayer(socket: WebSocket): GameRoom | undefined
	{
		for (const room of this.activeGames.values())
			if (room.player1.socket === socket || room.player2.socket === socket)
				return room
		return undefined
	}

	/**
	 * @brief Check if a player name is in any active 1v1 game
	 */
	public isPlayerInGame(playerName: string): boolean
	{
		for (const room of this.activeGames.values())
			if (room.player1.name === playerName || room.player2.name === playerName)
				return true
		return false
	}

	/**
	 * @brief Get the socket of a player by name
	 */
	public getSocketByPlayerName(playerName: string): WebSocket | undefined
	{
		for (const room of this.activeGames.values())
		{
			if (room.player1.name === playerName)
				return room.player1.socket
			if (room.player2.name === playerName)
				return room.player2.socket
		}
		return undefined
	}

	/**
	 * @brief Update player input for a game room
	 */
	public updatePlayerInput(
		socket: WebSocket,
		keys: { up: boolean; down: boolean; slot1?: boolean; slot2?: boolean; slot3?: boolean }
	): boolean
	{
		for (const room of this.activeGames.values())
		{
			if (room.player1.socket === socket)
				return room.player1Input = keys, true
			if (room.player2.socket === socket)
				return room.player2Input = keys, true
		}
		return false
	}

	/**
	 * @brief Store ping value received from client
	 */
	public handlePing(socket: WebSocket, pingValue: number): boolean
	{
		for (const room of this.activeGames.values())
		{
			if (room.player1.socket === socket)
				return room.player1Ping = pingValue, true
			if (room.player2.socket === socket)
				return room.player2Ping = pingValue, true
		}
		return false
	}

	/**
	 * @brief Get game state for spectating
	 */
	public getGameState(gameId: string): { players: Array<{ lives: number }> } | undefined
	{
		const room = this.activeGames.get(gameId)
		if (!room)
			return undefined
		const state = room.gameService.getGameState()
		return { players: state.players.map((p: GamePlayer) => ({ lives: p.lives })) }
	}
}
