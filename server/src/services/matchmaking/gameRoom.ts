import { WebSocket } from 'ws'
import { GameState, WebSocketMessage } from '../../types.js'
import { LobbyPlayer } from '@app/shared/types.js'
import { Player, GameRoom, BattleRoyaleRoom, BattleRoyalePlayer } from './types.js'
import { GameService, PlayerInput } from '../game/game.js'
import { AIPlayer } from '../aiplayer/AIPlayer.js'
import { EasyAIPlayer } from '../aiplayer/EasyAIPlayer.js'
import { NormalAIPlayer } from '../aiplayer/NormalAIPlayer.js'
import { BRNormalAIPlayer } from '../aiplayer/BRNormalAIPlayer.js'
import { canvasWidth, canvasHeight } from '@app/shared/consts.js'

/**
 * @brief Manages active game rooms and their game loops
 */
export class GameRoomManager
{
	private activeGames: Map<string, GameRoom> = new Map()
	private battleRoyaleGames: Map<string, BattleRoyaleRoom> = new Map()

	/**
	 * @brief Create game room for 1v1 match
	 * @param player1 First player
	 * @param player2 Second player
	 * @param isCustom Enable power-ups mode
	 * @param tournamentMatch Optional tournament match info with callback
	 * @returns Created game room ID
	 */
	public createGame(
		player1: Player, 
		player2: Player, 
		isCustom: boolean,
		fruitFrequency: 'low' | 'normal' | 'high' = 'normal',
		lifeCount: number = 5,
		tournamentMatch?: {
			tournamentId: string
			matchId: string
			isFinalMatch: boolean
			onComplete: (winnerId: string, lives1: number, lives2: number) => void
		}
	): string
	{
		const gameId = Math.random().toString(36).substr(2, 9)
		const gameService = new GameService(canvasWidth, canvasHeight, isCustom, fruitFrequency, lifeCount, 2, [player1.name, player2.name])
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
			player1Ping: 0,
			player2Ping: 0,
			isCustom,
			...(tournamentMatch && { tournamentMatch })
		}
		this.activeGames.set(gameId, room)
		return gameId
	}

	/**
	 * @brief Create AI game room
	 * @param player1 Human player
	 * @param isCustom Enable power-ups mode
	 * @param difficulty AI difficulty (0=easy, 1=normal, 2=hard)
	 * @param fruitFrequency Frequency of fruit spawning
	 * @param maxScore Maximum score to win the game
	 * @returns Created game room ID
	 */
	public createAIGame(
		player1: Player,
		isCustom: boolean,
		difficulty: number = 1,
		fruitFrequency: 'low' | 'normal' | 'high' = 'normal',
		lifeCount: number = 5,
		aiName: string = 'XavierNiel'
	): string
	{
		const gameId = Math.random().toString(36).substr(2, 9)
		const gameService = new GameService(
			canvasWidth, canvasHeight, isCustom, fruitFrequency, lifeCount, 2, [player1.name, aiName]
		)
		const gameLoop = setInterval(() => this.updateGame(gameId), 16)
		const player2Input = { up: false, down: false }
		const aiPlayer = this.createAIPlayer(difficulty, gameService, player2Input)
		const room: GameRoom = {
			id: gameId,
			player1,
			player2: { socket: null as any, name: aiName, id: 'AI' },
			gameService,
			gameLoop,
			player1Input: { up: false, down: false },
			player2Input: player2Input,
			player1PrevSlots: { slot1: false, slot2: false, slot3: false },
			player2PrevSlots: { slot1: false, slot2: false, slot3: false },
			player1Ping: 0,
			player2Ping: 0,
			ai: aiPlayer,
			isCustom
		}
		room.ai!.start()
		this.activeGames.set(gameId, room)
		return gameId
	}

	/**
	 * @brief Instantiate AI player based on difficulty
	 * @param difficulty 0=easy, 1=normal, 2=hard
	 * @param gameService Game service instance
	 * @param inputState AI input state reference
	 * @returns AIPlayer instance
	 */
	private createAIPlayer(
		difficulty: number,
		gameService: GameService,
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
	 * @brief Create Battle Royale game room for 3-6 players
	 * @param lobbyPlayers Array of lobby players
	 * @param sockets Map of player IDs to WebSockets
	 * @param isCustom Enable power-ups mode
	 * @param fruitFrequency Frequency of fruit spawning
	 * @param lifeCount Number of lives per player
	 * @returns Created game room ID
	 */
	public createBattleRoyaleGame(
		lobbyPlayers: LobbyPlayer[],
		sockets: Map<string, WebSocket>,
		isCustom: boolean,
		fruitFrequency: 'low' | 'normal' | 'high' = 'normal',
		lifeCount: number = 5
	): string
	{
		const gameId = Math.random().toString(36).substr(2, 9)
		const playerNames = lobbyPlayers.map(p => p.name)
		const playerCount = lobbyPlayers.length
		const gameService = new GameService(
			canvasWidth, canvasHeight, isCustom, fruitFrequency, lifeCount, playerCount, playerNames
		)
		const brPlayers: BattleRoyalePlayer[] = lobbyPlayers.map((lp, index) => {
			const inputState = { up: false, down: false }
			const brPlayer: BattleRoyalePlayer = {
				socket: lp.isBot ? null : (sockets.get(lp.id) || null),
				name: lp.name,
				id: lp.id,
				isBot: lp.isBot,
				input: inputState,
				prevSlots: { slot1: false, slot2: false, slot3: false },
				ping: 0
			}
			if (lp.isBot)
				brPlayer.ai = new BRNormalAIPlayer(index, gameService, inputState)
			return brPlayer
		})
		const room: BattleRoyaleRoom = {
			id: gameId,
			players: brPlayers,
			gameService,
			gameLoop: setInterval(() => this.updateBattleRoyaleGame(gameId), 16),
			isCustom
		}
		this.battleRoyaleGames.set(gameId, room)
		for (let i = 0; i < brPlayers.length; i++)
		{
			const player = brPlayers[i]!
			if (player.isBot && player.ai)
				player.ai.start()
			if (player.socket)
			{
				this.sendMessage(player.socket, {
					type: 'gameStart',
					playerRole: `player${i + 1}` as 'player1' | 'player2',
					isCustom,
					player1Name: playerNames[0] || 'Player 1',
					player2Name: playerNames[1] || 'Player 2'
				})
			}
		}
		console.log(`[GAME_ROOM] Battle Royale game ${gameId} created with ${playerCount} players`)
		return gameId
	}

	/**
	 * @brief Update Battle Royale game state and broadcast to players
	 * @param gameId Battle Royale room ID
	 */
	private updateBattleRoyaleGame(gameId: string): void
	{
		const room = this.battleRoyaleGames.get(gameId)
		if (!room) return

		const inputs: PlayerInput[] = room.players.map((player, index) => {
			const slot1 = !!(player.input.slot1 && !player.prevSlots.slot1)
			const slot2 = !!(player.input.slot2 && !player.prevSlots.slot2)
			const slot3 = !!(player.input.slot3 && !player.prevSlots.slot3)
			player.prevSlots.slot1 = player.input.slot1 || false
			player.prevSlots.slot2 = player.input.slot2 || false
			player.prevSlots.slot3 = player.input.slot3 || false
			return {
				up: player.input.up,
				down: player.input.down,
				...(slot1 && { slot1: true }),
				...(slot2 && { slot2: true }),
				...(slot3 && { slot3: true })
			}
		})

		const gameOver = room.gameService.updateGame(16, inputs)
		if (gameOver || this.onlyBotsRemaining(room))
		{
			this.handleBattleRoyaleGameOver(room)
			this.endBattleRoyaleGame(gameId)
			return
		}
		this.broadcastBattleRoyaleState(room)
	}

	/**
	 * @brief Check if only bots remain in Battle Royale game
	 * @param room Battle Royale room
	 * @returns True if no human players are still playing
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
	 * @param room Battle Royale room
	 */
	private handleBattleRoyaleGameOver(room: BattleRoyaleRoom): void
	{
		const gameState = room.gameService.getGameState()
		const alivePlayers = gameState.players.filter(p => !p.isEliminated())
		const winnerIndex = gameState.players.findIndex(p => !p.isEliminated())
		const winner = winnerIndex >= 0 ? `player${winnerIndex + 1}` : 'player1'

		for (let i = 0; i < room.players.length; i++)
		{
			const player = room.players[i]!
			if (player.socket)
			{
				const isWinner = i === winnerIndex
				this.sendMessage(player.socket, {
					type: 'gameOver',
					winner: winner as 'player1' | 'player2',
					lives1: gameState.players[0]?.lives || 0,
					lives2: gameState.players[1]?.lives || 0,
					isTournament: false,
					isBattleRoyale: true,
					shouldDisconnect: true
				})
			}
		}
		console.log(`[GAME_ROOM] Battle Royale ${room.id} ended, winner: ${winner}`)
	}

	/**
	 * @brief Broadcast Battle Royale state to all players
	 * @param room Battle Royale room
	 */
	private broadcastBattleRoyaleState(room: BattleRoyaleRoom): void
	{
		const gameState = room.gameService.getGameState()
		const polygonData = room.gameService.getPolygonData()
		const baseState = {
			players: gameState.players.map((p, index) => ({
				paddle: {
					y: p.paddle.positionY,
					x: p.paddle.positionX,
					angle: p.paddle.angle,
					sidePosition: p.paddle.sidePosition,
					length: p.paddle.height,
					width: p.paddle.width
				},
				lives: p.lives,
				isEliminated: p.isEliminated(),
				name: p.name,
				ping: room.players[index]?.ping || 0,
				itemSlots: p.itemSlots,
				pendingPowerUps: p.pendingPowerUps,
				selectedSlots: p.selectedSlots,
				hitStreak: p.hitStreak,
				chargingPowerUp: p.chargingPowerUp
			})),
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
			fruits: gameState.fruits,
			isBattleRoyale: true
		}
		const stateMessage: GameState = polygonData
			? { ...baseState, polygonData }
			: baseState
		for (const player of room.players)
		{
			if (player.socket)
				this.sendMessage(player.socket, { type: 'gameState', data: stateMessage })
		}
	}

	/**
	 * @brief End Battle Royale game and cleanup
	 * @param gameId Battle Royale room ID
	 */
	public endBattleRoyaleGame(gameId: string): void
	{
		const room = this.battleRoyaleGames.get(gameId)
		if (!room) return
		if (room.gameLoop)
			clearInterval(room.gameLoop)
		for (const player of room.players)
		{
			if (player.ai)
				player.ai.stop()
		}
		this.battleRoyaleGames.delete(gameId)
		console.log(`[GAME_ROOM] Battle Royale ${gameId} cleaned up`)
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
				return
			}
			else if (room.player2.socket === socket)
			{
				room.player2Input = keys
				return
			}
		}
		for (const room of this.battleRoyaleGames.values())
		{
			const player = room.players.find(p => p.socket === socket)
			if (player)
			{
				player.input = keys
				return
			}
		}
	}

	/**
	 * @brief Store ping value received from client
	 * @param socket Player's WebSocket
	 * @param pingValue RTT calculated by client
	 */
	public handlePing(socket: WebSocket, pingValue: number): void
	{
		for (const room of this.activeGames.values())
		{
			if (room.player1.socket === socket)
			{
				room.player1Ping = pingValue
				return
			}
			else if (room.player2.socket === socket)
			{
				room.player2Ping = pingValue
				return
			}
		}
		for (const room of this.battleRoyaleGames.values())
		{
			const player = room.players.find(p => p.socket === socket)
			if (player)
			{
				player.ping = pingValue
				return
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
	 * @brief Find Battle Royale game by player socket
	 * @param socket Player's WebSocket
	 * @returns BR room and player index or undefined
	 */
	public findBattleRoyaleByPlayer(socket: WebSocket): { room: BattleRoyaleRoom; playerIndex: number } | undefined
	{
		for (const room of this.battleRoyaleGames.values())
		{
			const playerIndex = room.players.findIndex(p => p.socket === socket);
			if (playerIndex >= 0)
				return { room, playerIndex };
		}
		return undefined;
	}

	/**
	 * @brief Handle player disconnection from Battle Royale
	 * @param socket Disconnected player's socket
	 * @returns True if handled
	 */
	public handleBattleRoyaleDisconnect(socket: WebSocket): boolean
	{
		const found = this.findBattleRoyaleByPlayer(socket);
		if (!found)
			return false;
		const { room, playerIndex } = found;
		const player = room.players[playerIndex];
		if (!player)
			return false;
		console.log(`[BR] Player ${player.name} disconnected`);
		player.socket = null;
		const gameOver = room.gameService.eliminatePlayer(playerIndex);
		
		if (gameOver)
		{
			const gameState = room.gameService.getGameState();
			const winnerIndex = gameState.players.findIndex(p => !p.isEliminated());
			const winner = gameState.players[winnerIndex];
			console.log(`[BR] Game Over! Winner: ${winner?.name ?? 'None'}`);
			
			for (let i = 0; i < room.players.length; i++)
			{
				const p = room.players[i];
				if (p?.socket)
				{
					this.sendMessage(p.socket, {
						type: 'gameOver',
						winner: `player${winnerIndex + 1}` as 'player1' | 'player2',
						lives1: gameState.players[0]?.lives || 0,
						lives2: gameState.players[1]?.lives || 0,
						isTournament: false,
						isBattleRoyale: true,
						shouldDisconnect: true
					});
				}
			}
			this.endBattleRoyaleGame(room.id);
		}
		else
		{
			this.broadcastBattleRoyaleState(room);
		}
		return true;
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

		const inputs: PlayerInput[] = [
			{
				up: room.player1Input.up,
				down: room.player1Input.down,
				...(slot1Pressed && { slot1: true }),
				...(slot2Pressed && { slot2: true }),
				...(slot3Pressed && { slot3: true })
			},
			{
				up: room.player2Input.up,
				down: room.player2Input.down,
				...(p2slot1Pressed && { slot1: true }),
				...(p2slot2Pressed && { slot2: true }),
				...(p2slot3Pressed && { slot3: true })
			}
		]
		const gameOver = room.gameService.updateGame(16, inputs)
		if (gameOver)
		{
			const gameState = room.gameService.getGameState()
			const p1 = gameState.players[0]!
			const p2 = gameState.players[1]!
		const winner = p1.lives > p2.lives ? 'player1' : 'player2'
		const winnerId = winner === 'player1' ? room.player1.id : room.player2.id
		const isTournament = !!room.tournamentMatch
		const isFinalMatch = room.tournamentMatch?.isFinalMatch ?? false
		
		if (room.player1.socket)
			this.sendMessage(room.player1.socket, { 
				type: 'gameOver', 
				winner, 
				lives1: p1.lives, 
				lives2: p2.lives,
				isTournament,
				shouldDisconnect: isFinalMatch || !isTournament || winner !== 'player1'
			})
		if (room.player2.socket && room.player2.id !== 'AI')
			this.sendMessage(room.player2.socket, { 
				type: 'gameOver', 
				winner, 
				lives1: p1.lives, 
				lives2: p2.lives,
				isTournament,
				shouldDisconnect: isFinalMatch || !isTournament || winner !== 'player2'
			})
		
		if (room.tournamentMatch)
		{
			console.log(`[GAME_ROOM] Tournament match completed: ${room.tournamentMatch.matchId}`)
			room.tournamentMatch.onComplete(winnerId, p1.lives, p2.lives)
		}			this.endGame(gameId)
			return
		}
		const gameState = room.gameService.getGameState()
		const stateMessage: GameState = {
			players: gameState.players.map((p, index) => ({
				paddle: { y: p.paddle.positionY },
				lives: p.lives,
				isEliminated: p.isEliminated(),
				name: p.name,
				ping: index === 0 ? room.player1Ping : room.player2Ping,
				itemSlots: p.itemSlots,
				pendingPowerUps: p.pendingPowerUps,
				selectedSlots: p.selectedSlots,
				hitStreak: p.hitStreak,
				chargingPowerUp: p.chargingPowerUp
			})),
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
