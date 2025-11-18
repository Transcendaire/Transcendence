import { WebSocket } from 'ws'
import { GameService } from './game/game.js'
import { GameState, GameInput, WebSocketMessage } from '../types.js'
import { AIPlayer } from './AIPlayer.js'
import { canvasWidth, canvasHeight } from '@app/shared/consts.js'

interface Player
{
	socket: WebSocket;
	name: string;
	id: string;
}

interface GameRoom
{
	id: string;
	player1: Player;
	player2: Player;
	gameService: GameService;
	gameLoop: NodeJS.Timeout | null;
	player1Input: { up: boolean; down: boolean; slot1?: boolean;
		slot2?: boolean; slot3?: boolean };
	player2Input: { up: boolean; down: boolean; slot1?: boolean;
		slot2?: boolean; slot3?: boolean };
	player1PrevSlots: { slot1: boolean; slot2: boolean; slot3: boolean };
	player2PrevSlots: { slot1: boolean; slot2: boolean; slot3: boolean };
}

/**
 * @brief Service handling player matchmaking and game room management
 */
export class MatchmakingService
{
	private waitingPlayers: Player[] = [];
	private activeGames: Map<string, GameRoom> = new Map();
	private playerSockets: Map<WebSocket, Player> = new Map();

	/**
	 * @brief Handle incoming WebSocket messages
	 * @param socket WebSocket connection that sent the message
	 * @param message Parsed WebSocket message
	 */
	public handleMessage(socket: WebSocket, message: WebSocketMessage): void
	{
		switch (message.type) {
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

	private addAIGame(socket: WebSocket, playerName: string,
		isCustom: boolean): void
	{
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
		const gameLoop = setInterval(() => {
			this.updateGame(gameId)
		}, 16)
		const room: GameRoom = {
			id: gameId,
			player1,
			player2: { socket: null as any, name: 'AI', id: 'AI' },
			gameService,
			gameLoop,
			player1Input: { up: false, down: false },
			player2Input: { up: false, down: false },
			player1PrevSlots: { slot1: false, slot2: false, slot3: false },
			player2PrevSlots: { slot1: false, slot2: false, slot3: false }
		}
		const ai = new AIPlayer('player2', gameService, room.player2Input)
		ai.start()
		this.activeGames.set(gameId, room)
		this.sendMessage(player1.socket, { type: "gameStart", playerRole: "player1" })
	}

	/**
	 * @brief Add player to matchmaking queue
	 * @param socket Player's WebSocket connection
	 * @param playerName Player's display name
	 * @param isCustom Enable custom mode with power-ups
	 */
	private addPlayer(socket: WebSocket, playerName: string,
		isCustom: boolean): void
	{
		const player: Player = {
			socket,
			name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		};

		this.playerSockets.set(socket, player);
		if (this.waitingPlayers.length >= 1) {
			const player1 = this.waitingPlayers.pop()!;
			
			this.createGame(player1, player, isCustom);
		} else {
			this.waitingPlayers.push(player);
			this.sendMessage(socket, {
				type: "waiting"
			});
			this.sendMessage(socket, {
				type: "playerJoined",
				playerCount: 1
			});
		}
	}

	/**
	 * @brief Remove player from matchmaking and end any active games
	 * @param socket Player's WebSocket connection to remove
	 */
	public removePlayer(socket: WebSocket): void
	{
		const player = this.playerSockets.get(socket);
		const index = this.waitingPlayers.findIndex(p => p.socket === socket);
		
		if (!player)
			return;
		if (index > -1)
			this.waitingPlayers.splice(index, 1);
		for (const [gameId, room] of this.activeGames.entries()) {
			if (room.player1.socket === socket || room.player2.socket === socket) {
				this.endGame(gameId);
				break;
			}
		}
		this.playerSockets.delete(socket);
	}

	/**
	 * @brief Handle player input for active games
	 * @param socket Player's WebSocket connection
	 * @param input Player's input state
	 */
	private handleInput(socket: WebSocket, input: GameInput): void
	{
		for (const room of this.activeGames.values()) {
			if (room.player1.socket === socket) {
				room.player1Input = input.keys;
				break;
			} else if (room.player2.socket === socket) {
				room.player2Input = input.keys;
				break;
			}
		}
	}

	/**
	 * @brief Create new game room for two players
	 * @param player1 First player
	 * @param player2 Second player
	 * @param isCustom Enable custom mode with power-ups
	 */
	private createGame(player1: Player, player2: Player,
		isCustom: boolean): void
	{
		const gameId = Math.random().toString(36).substr(2, 9);
		const gameService = new GameService(canvasWidth, canvasHeight, isCustom);
		const gameLoop = setInterval(() => {
			this.updateGame(gameId);
		}, 16);
		const room: GameRoom = {
			id: gameId,
			player1,
			player2,
			gameService,
			gameLoop,
			player1Input: { up: false, down: false },
			player2Input: { up: false, down: false },
			player1PrevSlots: { slot1: false, slot2: false, slot3: false },
			player2PrevSlots: { slot1: false, slot2: false, slot3: false }
		};

		this.activeGames.set(gameId, room);
		this.sendMessage(player1.socket, { type: "gameStart", playerRole: "player1" });
		this.sendMessage(player2.socket, { type: "gameStart", playerRole: "player2" });
	}

	/**
	 * @brief Update game state and broadcast to players
	 * @param gameId ID of the game room to update
	 */
	private updateGame(gameId: string): void
	{
		const room = this.activeGames.get(gameId);

		if (!room)
			return;

		const slot1Pressed = !!(room.player1Input.slot1 && !room.player1PrevSlots.slot1);
		const slot2Pressed = !!(room.player1Input.slot2 && !room.player1PrevSlots.slot2);
		const slot3Pressed = !!(room.player1Input.slot3 && !room.player1PrevSlots.slot3);
		const p2slot1Pressed = !!(room.player2Input.slot1 && !room.player2PrevSlots.slot1);
		const p2slot2Pressed = !!(room.player2Input.slot2 && !room.player2PrevSlots.slot2);
		const p2slot3Pressed = !!(room.player2Input.slot3 && !room.player2PrevSlots.slot3);

		room.player1PrevSlots.slot1 = room.player1Input.slot1 || false;
		room.player1PrevSlots.slot2 = room.player1Input.slot2 || false;
		room.player1PrevSlots.slot3 = room.player1Input.slot3 || false;
		room.player2PrevSlots.slot1 = room.player2Input.slot1 || false;
		room.player2PrevSlots.slot2 = room.player2Input.slot2 || false;
		room.player2PrevSlots.slot3 = room.player2Input.slot3 || false;

		const p1Input = {
			up: room.player1Input.up,
			down: room.player1Input.down,
			...(slot1Pressed && { slot1: true }),
			...(slot2Pressed && { slot2: true }),
			...(slot3Pressed && { slot3: true })
		};
		const p2Input = {
			up: room.player2Input.up,
			down: room.player2Input.down,
			...(p2slot1Pressed && { slot1: true }),
			...(p2slot2Pressed && { slot2: true }),
			...(p2slot3Pressed && { slot3: true })
		};

		room.gameService.updateGame(16, p1Input, p2Input);
		const gameState = room?.gameService.getGameState();
		const stateMessage: GameState = {
			player1: {
				paddle: { y: gameState!.player1.paddle.positionY },
				score: gameState!.player1.score,
				itemSlots: gameState!.player1.itemSlots,
				pendingPowerUps: gameState!.player1.pendingPowerUps,
				selectedSlots: gameState!.player1.selectedSlots,
				hitStreak: gameState!.player1.hitStreak,
				chargingPowerUp: gameState!.player1.chargingPowerUp
			},
			player2: {
				paddle: { y: gameState!.player2.paddle.positionY },
				score: gameState!.player2.score,
				itemSlots: gameState!.player2.itemSlots,
				pendingPowerUps: gameState!.player2.pendingPowerUps,
				selectedSlots: gameState!.player2.selectedSlots,
				hitStreak: gameState!.player2.hitStreak,
				chargingPowerUp: gameState!.player2.chargingPowerUp
			},
			ball: {
				x: gameState!.ball.positionX,
				y: gameState!.ball.positionY,
				vx: gameState!.ball.velocityX,
				vy: gameState!.ball.velocityY
			},
			cloneBalls: gameState!.cloneBalls.map(clone => ({
				x: clone.positionX,
				y: clone.positionY,
				vx: clone.velocityX,
				vy: clone.velocityY
			}))
		};

		if (room.player1.socket)
			this.sendMessage(room.player1.socket, { type: "gameState", data: stateMessage });
		if (room.player2.socket)
			this.sendMessage(room.player2.socket, { type: "gameState", data: stateMessage });
	}

	/**
	 * @brief End game and cleanup resources
	 * @param gameId ID of the game room to end
	 */
	private endGame(gameId: string): void
	{
		const room = this.activeGames.get(gameId);
		
		if (!room)
			return;
		if (room.gameLoop)
			clearInterval(room.gameLoop);
		this.activeGames.delete(gameId);
	}

	/**
	 * @brief Send message to WebSocket client
	 * @param socket Target WebSocket connection
	 * @param message Message to send
	 */
	private sendMessage(socket: WebSocket, message: WebSocketMessage): void
	{
		if (socket && socket.readyState === socket.OPEN)
			socket.send(JSON.stringify(message));
	}
}
