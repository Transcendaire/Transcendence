import { WebSocket } from 'ws'
import { GameState, PlayerOnlineStatus } from '../../../types.js'
import { LobbyPlayer } from '@app/shared/types.js'
import { BattleRoyaleRoom, BattleRoyalePlayer } from '../core/types.js'
import { GameService, PlayerInput } from '../../game/game.js'
import { Player } from '@app/shared/models/Player.js'
import { NormalAIPlayer } from '../../aiplayer/NormalAIPlayer.js'
import { BRNormalAIPlayer } from '../../aiplayer/BRNormalAIPlayer.js'
import { canvasWidth, canvasHeight } from '@app/shared/consts.js'
import { getDatabase } from '../../../db/databaseSingleton.js'
import { sendGameOver, sendGameStart, sendGameState } from './gameMessages.js'

type StatusCallback = (playerName: string, status: PlayerOnlineStatus) => void

/**
 * @brief Manages Battle Royale game rooms
 */
export class BattleRoyaleManager
{
	private battleRoyaleGames: Map<string, BattleRoyaleRoom> = new Map()
	private onStatusChange?: StatusCallback

	public setStatusCallback(callback: StatusCallback): void
	{
		this.onStatusChange = callback
	}

	/**
	 * @brief Create Battle Royale game room for 3-16 players
	 */
	public createGame(
		lobbyPlayers: LobbyPlayer[], sockets: Map<string, WebSocket>, isCustom: boolean,
		fruitFrequency: 'low' | 'normal' | 'high' = 'normal', lifeCount: number = 5
	): string
	{
		const gameId = Math.random().toString(36).substr(2, 9)
		const playerNames = lobbyPlayers.map(p => p.name)
		const playerCount = lobbyPlayers.length
		const gameService = new GameService(
			canvasWidth, canvasHeight, isCustom, fruitFrequency, lifeCount, playerCount, playerNames
		)
		const brPlayers = this.createBRPlayers(lobbyPlayers, sockets, gameService, playerCount)
		const room: BattleRoyaleRoom = {
			id: gameId, players: brPlayers, gameService,
			gameLoop: setInterval(() => this.updateGame(gameId), 16), isCustom
		}
		this.battleRoyaleGames.set(gameId, room)
		this.initializePlayers(brPlayers, isCustom, playerNames)
		this.logGameCreation(gameId, playerCount, gameService)
		return gameId
	}

	/**
	 * @brief Create Battle Royale player objects
	 */
	private createBRPlayers(
		lobbyPlayers: LobbyPlayer[], sockets: Map<string, WebSocket>,
		gameService: GameService, playerCount: number
	): BattleRoyalePlayer[]
	{
		return lobbyPlayers.map((lp, index) => {
			const inputState = { up: false, down: false }
			const brPlayer: BattleRoyalePlayer = {
				socket: lp.isBot ? null : (sockets.get(lp.id) || null),
				name: lp.name, id: lp.id, isBot: lp.isBot, input: inputState,
				prevSlots: { slot1: false, slot2: false, slot3: false }, ping: 0
			}
			if (lp.isBot)
				brPlayer.ai = this.createBotAI(index, gameService, inputState, playerCount)
			return brPlayer
		})
	}

	/**
	 * @brief Create appropriate AI for a bot player
	 */
	private createBotAI(
		index: number, gameService: GameService,
		inputState: { up: boolean; down: boolean }, playerCount: number
	): BRNormalAIPlayer | NormalAIPlayer
	{
		if (playerCount === 2)
		{
			const role = index === 0 ? 'player1' : 'player2'
			return new NormalAIPlayer(role, gameService, inputState)
		}
		return new BRNormalAIPlayer(index, gameService, inputState)
	}

	/**
	 * @brief Initialize players after room creation
	 */
	private initializePlayers(
		players: BattleRoyalePlayer[], isCustom: boolean, playerNames: string[]
	): void
	{
		for (let i = 0; i < players.length; i++)
		{
			const player = players[i]!
			if (player.isBot && player.ai)
				player.ai.start()
			if (player.socket)
			{
				sendGameStart(
					player.socket, `player${i + 1}` as 'player1' | 'player2',
					isCustom, playerNames[0] || 'Player 1', playerNames[1] || 'Player 2'
				)
			}
			if (!player.isBot)
				this.onStatusChange?.(player.name, 'in-game')
		}
	}

	/**
	 * @brief Log game creation details
	 */
	private logGameCreation(
		gameId: string, playerCount: number, gameService: GameService
	): void
	{
		console.log(`[GAME_ROOM] Battle Royale game ${gameId} created with ${playerCount} players`)
		const gameState = gameService.getGameState()
		for (let i = 0; i < gameState.players.length; i++)
		{
			const p = gameState.players[i]!
			const angleDeg = (p.paddle.angle * 180 / Math.PI).toFixed(1)
			console.log(`[BR_INIT] Player ${i}: "${p.name}" | angle: ${angleDeg}°`)
		}
	}

	/**
	 * @brief Update Battle Royale game state and broadcast to players
	 */
	private updateGame(gameId: string): void
	{
		const room = this.battleRoyaleGames.get(gameId)
		if (!room)
			return
		const inputs = this.collectInputs(room)
		const gameOver = room.gameService.updateGame(16, inputs)
		if (gameOver || this.onlyBotsRemaining(room))
		{
			this.handleGameOver(room)
			this.endGame(gameId)
			return
		}
		if (room.gameService.hasSwitchedToClassic())
			this.switchBotsToClassicMode(room)
		this.broadcastState(room)
	}

	/**
	 * @brief Collect inputs from all players
	 */
	private collectInputs(room: BattleRoyaleRoom): PlayerInput[]
	{
		return room.players.map((player) => {
			const slot1 = !!(player.input.slot1 && !player.prevSlots.slot1)
			const slot2 = !!(player.input.slot2 && !player.prevSlots.slot2)
			const slot3 = !!(player.input.slot3 && !player.prevSlots.slot3)
			player.prevSlots.slot1 = player.input.slot1 || false
			player.prevSlots.slot2 = player.input.slot2 || false
			player.prevSlots.slot3 = player.input.slot3 || false
			return {
				up: player.input.up, down: player.input.down,
				...(slot1 && { slot1: true }),
				...(slot2 && { slot2: true }),
				...(slot3 && { slot3: true })
			}
		})
	}

	/**
	 * @brief Switch bot AI when 2 players remain
	 */
	private switchBotsToClassicMode(room: BattleRoyaleRoom): void
	{
		const gameState = room.gameService.getGameState()
		const activeIndices: number[] = []
		for (let i = 0; i < gameState.players.length; i++)
			if (!gameState.players[i]!.isEliminated())
				activeIndices.push(i)
		if (activeIndices.length !== 2)
			return

		for (let i = 0; i < 2; i++)
		{
			const playerIndex = activeIndices[i]!
			const brPlayer = room.players[playerIndex]
			if (!brPlayer?.isBot)
				continue
			if (brPlayer.ai)
				brPlayer.ai.stop()
			const role = i === 0 ? 'player1' : 'player2'
			const newAI = new NormalAIPlayer(role, room.gameService, brPlayer.input)
			brPlayer.ai = newAI as any
			newAI.start()
			console.log(`[BR] Switched ${brPlayer.name} AI to NormalAIPlayer (role: ${role})`)
			return
		}
	}

	/**
	 * @brief Check if only bots remain in Battle Royale game
	 */
	private onlyBotsRemaining(room: BattleRoyaleRoom): boolean
	{
		const gameState = room.gameService.getGameState()
		for (let i = 0; i < room.players.length; i++)
		{
			const brPlayer = room.players[i]
			const gsPlayer = gameState.players[i]
			if (!brPlayer || !gsPlayer)
				continue
			if (!brPlayer.isBot && !gsPlayer.isEliminated())
				return false
		}
		return true
	}

	/**
	 * @brief Handle Battle Royale game over
	 */
	private handleGameOver(room: BattleRoyaleRoom): void
	{
		const gameState = room.gameService.getGameState()
		const winnerIndex = gameState.players.findIndex(p => !p.isEliminated())
		const winner = winnerIndex >= 0 ? `player${winnerIndex + 1}` : 'player1'
		this.sendGameOverToAll(room, winner as 'player1' | 'player2', gameState)
		console.log(`[GAME_ROOM] Battle Royale ${room.id} ended, winner: ${winner}`)
		this.recordResults(room, winnerIndex, gameState)
	}

	/**
	 * @brief Send game over to all players in room
	 */
	private sendGameOverToAll(
		room: BattleRoyaleRoom, winner: 'player1' | 'player2',
		gameState: { players: Array<{ lives: number }> }, forfeit: boolean = false
	): void
	{
		for (let i = 0; i < room.players.length; i++)
		{
			const player = room.players[i]!
			if (player.socket)
			{
				sendGameOver(player.socket, {
					winner, isBattleRoyale: true, shouldDisconnect: true, forfeit,
					lives1: gameState.players[0]?.lives || 0,
					lives2: gameState.players[1]?.lives || 0
				})
			}
		}
	}

	/**
	 * @brief Record game results for human players
	 */
	private recordResults(
		room: BattleRoyaleRoom, winnerIndex: number,
		gameState: ReturnType<GameService['getGameState']>
	): void
	{
		const humanPlayers = room.players.filter(p => !p.isBot)
		const botCount = room.players.filter(p => p.isBot).length
		if (humanPlayers.length < 2)
			return

		try
		{
			const db = getDatabase()
			const totalPlayers = room.players.length
			const humanCount = humanPlayers.length
			const humanNames = humanPlayers.map(p => p.name)
			const eliminationOrder = room.gameService.getEliminationOrder()
			if (winnerIndex >= 0)
				eliminationOrder.push(winnerIndex)
			for (let i = 0; i < humanPlayers.length; i++)
			{
				const player = humanPlayers[i]!
				const playerIndex = room.players.findIndex(p => p.name === player.name)
				const gsPlayer = gameState.players[playerIndex]
				const isWinner = playerIndex === winnerIndex
				const eliminationPos = eliminationOrder.indexOf(playerIndex)
				const positionAll = totalPlayers - eliminationPos
				const humanElimOrder = eliminationOrder.filter((idx: number) => !room.players[idx]?.isBot)
				const humanElimPos = humanElimOrder.indexOf(playerIndex)
				const positionHumans = humanCount - humanElimPos
				const otherHumans = humanNames.filter(n => n !== player.name).join(', ')
				db.recordGameResult(
					player.name, 'battle_royale', otherHumans, humanCount,
					gsPlayer?.lives || 0, 0, positionHumans, isWinner ? 'win' : 'loss',
					undefined, botCount, positionAll
				)
			}
			console.log(`[GAME_ROOM] BR result recorded for ${humanPlayers.length} human players`)
		}
		catch (error)
		{
			console.error('[GAME_ROOM] Failed to record Battle Royale result:', error)
		}
	}

	/**
	 * @brief Broadcast Battle Royale state to all players
	 */
	private broadcastState(room: BattleRoyaleRoom): void
	{
		const gameState = room.gameService.getGameState()
		const polygonData = room.gameService.getPolygonData()
		const stateMessage = this.buildStateMessage(room, gameState, polygonData)
		for (const player of room.players)
			sendGameState(player.socket, stateMessage)
	}

	/**
	 * @brief Build game state message for broadcast
	 */
	private buildStateMessage(
		room: BattleRoyaleRoom, gameState: ReturnType<GameService['getGameState']>,
		polygonData: ReturnType<GameService['getPolygonData']>
	): GameState
	{
		const baseState = {
			players: gameState.players.map((p, index) => ({
				paddle: {
					y: p.paddle.positionY, x: p.paddle.positionX,
					angle: p.paddle.angle, sidePosition: p.paddle.sidePosition,
					length: p.paddle.height, width: p.paddle.width
				},
				lives: p.lives, isEliminated: p.isEliminated(), name: p.name,
				ping: room.players[index]?.ping || 0,
				itemSlots: p.itemSlots, pendingPowerUps: p.pendingPowerUps,
				selectedSlots: p.selectedSlots, hitStreak: p.hitStreak,
				chargingPowerUp: p.chargingPowerUp
			})),
			ball: {
				x: gameState.ball.positionX, y: gameState.ball.positionY,
				vx: gameState.ball.velocityX, vy: gameState.ball.velocityY
			},
			balls: gameState.balls?.map(b => ({
				x: b.positionX, y: b.positionY, vx: b.velocityX, vy: b.velocityY
			})) || [],
			cloneBalls: gameState.cloneBalls.map(clone => ({
				x: clone.positionX, y: clone.positionY, vx: clone.velocityX, vy: clone.velocityY
			})),
			fruits: gameState.fruits,
			isBattleRoyale: true
		}
		if (polygonData)
			return { ...baseState, polygonData }
		return baseState
	}

	/**
	 * @brief End Battle Royale game and cleanup
	 */
	public endGame(gameId: string): void
	{
		const room = this.battleRoyaleGames.get(gameId)
		if (!room)
			return
		if (room.gameLoop)
			clearInterval(room.gameLoop)
		for (const player of room.players)
		{
			if (player.ai)
				player.ai.stop()
			if (!player.isBot)
				this.onStatusChange?.(player.name, 'online')
		}
		this.battleRoyaleGames.delete(gameId)
		console.log(`[GAME_ROOM] Battle Royale ${gameId} cleaned up`)
	}

	/**
	 * @brief Handle player disconnection from Battle Royale
	 */
	public handleDisconnect(socket: WebSocket, isSurrender: boolean = false): boolean
	{
		const found = this.findByPlayer(socket)
		if (!found)
			return false
		const { room, playerIndex } = found
		const player = room.players[playerIndex]
		if (!player)
			return false
		console.log(`[BR] Player ${player.name} ${isSurrender ? 'surrendered' : 'disconnected'}`)
		if (isSurrender && player.socket)
		{
			console.log(`[BR] Sending gameOver to surrendering player ${player.name}`)
			sendGameOver(player.socket, {
				winner: 'player0', lives1: 0, lives2: 0,
				isBattleRoyale: true, shouldDisconnect: true, forfeit: true
			})
		}
		player.socket = null
		const gameOver = room.gameService.eliminatePlayer(playerIndex)
		if (gameOver)
		{
			this.handleDisconnectGameOver(room, isSurrender)
			this.endGame(room.id)
		}
		else
			this.broadcastState(room)
		return true
	}

	/**
	 * @brief Handle game over triggered by disconnection
	 */
	private handleDisconnectGameOver(room: BattleRoyaleRoom, isSurrender: boolean): void
	{
		const gameState = room.gameService.getGameState()
		const winnerIndex = gameState.players.findIndex((p: Player) => !p.isEliminated())
		const winner = gameState.players[winnerIndex]
		console.log(`[BR] Game Over! Winner: ${winner?.name ?? 'None'}`)
		const winnerStr = `player${winnerIndex + 1}` as 'player1' | 'player2'
		this.sendGameOverToAll(room, winnerStr, gameState, isSurrender)
	}

	/**
	 * @brief Find Battle Royale game by player socket
	 */
	public findByPlayer(socket: WebSocket): { room: BattleRoyaleRoom; playerIndex: number } | undefined
	{
		for (const room of this.battleRoyaleGames.values())
		{
			const playerIndex = room.players.findIndex(p => p.socket === socket)
			if (playerIndex >= 0)
				return { room, playerIndex }
		}
		return undefined
	}

	/**
	 * @brief Update player input for a BR game
	 */
	public updatePlayerInput(
		socket: WebSocket,
		keys: { up: boolean; down: boolean; slot1?: boolean; slot2?: boolean; slot3?: boolean }
	): boolean
	{
		for (const room of this.battleRoyaleGames.values())
		{
			const player = room.players.find(p => p.socket === socket)
			if (player)
				return player.input = keys, true
		}
		return false
	}

	/**
	 * @brief Store ping value for a BR player
	 */
	public handlePing(socket: WebSocket, pingValue: number): boolean
	{
		for (const room of this.battleRoyaleGames.values())
		{
			const player = room.players.find(p => p.socket === socket)
			if (player)
				return player.ping = pingValue, true
		}
		return false
	}

	/**
	 * @brief Check if a player name is in any Battle Royale game
	 */
	public isPlayerInGame(playerName: string): boolean
	{
		for (const room of this.battleRoyaleGames.values())
			if (room.players.some(p => p.name === playerName))
				return true
		return false
	}

	/**
	 * @brief Get socket by player name in any BR game
	 */
	public getSocketByPlayerName(playerName: string): WebSocket | undefined
	{
		for (const room of this.battleRoyaleGames.values())
		{
			const player = room.players.find(p => p.name === playerName)
			if (player?.socket)
				return player.socket
		}
		return undefined
	}
}
