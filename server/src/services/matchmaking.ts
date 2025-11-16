import { WebSocket } from 'ws'
import { GameService } from './main.js'
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
	player1Input: { up: boolean; down: boolean };
	player2Input: { up: boolean; down: boolean };
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
					this.addPlayer(socket, message.playerName)
				break
			case 'joinAI':
				if (message.playerName)
					this.addAIGame(socket, message.playerName)
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

	private addAIGame(socket: WebSocket, playerName: string): void
	{
		const player: Player = {
			socket,
			name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		}
		this.playerSockets.set(socket, player)
		this.createAIGame(player)
	}

	private createAIGame(player1: Player): void
	{
		const gameId = Math.random().toString(36).substr(2, 9)
		const gameService = new GameService(canvasWidth, canvasHeight)
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
			player2Input: { up: false, down: false }
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
	 */
	private addPlayer(socket: WebSocket, playerName: string): void
	{
		const player: Player = {
			socket,
			name: playerName,
			id: Math.random().toString(36).substr(2, 9)
		};

		this.playerSockets.set(socket, player);
		if (this.waitingPlayers.length >= 1) {
			const player1 = this.waitingPlayers.pop()!;
			
			this.createGame(player1, player);
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
	 */
	private createGame(player1: Player, player2: Player): void
	{
		const gameId = Math.random().toString(36).substr(2, 9);
		const gameService = new GameService(canvasWidth, canvasHeight);
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
			player2Input: { up: false, down: false }
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
		const gameState = room?.gameService.getGameState();
		const stateMessage: GameState = {
			player1: {
				paddle: { y: gameState!.player1.paddle.positionY },
				score: gameState!.player1.score
			},
			player2: {
				paddle: { y: gameState!.player2.paddle.positionY },
				score: gameState!.player2.score
			},
			ball: {
				x: gameState!.ball.positionX,
				y: gameState!.ball.positionY,
				vx: gameState!.ball.velocityX,
				vy: gameState!.ball.velocityY
			}
		};

		if (!room)
			return;
		room.gameService.updateGame(16, room.player1Input, room.player2Input);
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
