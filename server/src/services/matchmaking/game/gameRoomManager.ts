import { WebSocket } from 'ws'
import { PlayerOnlineStatus } from '../../../types.js'
import { LobbyPlayer } from '@app/shared/types.js'
import { Player, GameRoom, BattleRoyaleRoom } from '../core/types.js'
import { ClassicGameManager } from './classicGameManager.js'
import { BattleRoyaleManager } from './battleRoyaleManager.js'

type StatusCallback = (playerName: string, status: PlayerOnlineStatus) => void

/**
 * @brief Facade that manages both classic 1v1 and Battle Royale game rooms
 */
export class GameRoomManager
{
	private classicManager: ClassicGameManager
	private brManager: BattleRoyaleManager

	constructor()
	{
		this.classicManager = new ClassicGameManager()
		this.brManager = new BattleRoyaleManager()
	}

	/**
	 * @brief Set status change callback for both managers
	 */
	public setStatusCallback(callback: StatusCallback): void
	{
		this.classicManager.setStatusCallback(callback)
		this.brManager.setStatusCallback(callback)
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
		return this.classicManager.createGame(
			player1, player2, isCustom, fruitFrequency, lifeCount, tournamentMatch
		)
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
		return this.classicManager.createAIGame(
			player1, isCustom, difficulty, fruitFrequency, lifeCount, aiName
		)
	}

	/**
	 * @brief Create Battle Royale game room
	 */
	public createBattleRoyaleGame(
		lobbyPlayers: LobbyPlayer[], sockets: Map<string, WebSocket>, isCustom: boolean,
		fruitFrequency: 'low' | 'normal' | 'high' = 'normal', lifeCount: number = 5
	): string
	{
		return this.brManager.createGame(lobbyPlayers, sockets, isCustom, fruitFrequency, lifeCount)
	}

	/**
	 * @brief End Battle Royale game and cleanup
	 */
	public endBattleRoyaleGame(gameId: string): void
	{
		this.brManager.endGame(gameId)
	}

	/**
	 * @brief Update player input for a game room
	 */
	public updatePlayerInput(
		socket: WebSocket,
		keys: { up: boolean; down: boolean; slot1?: boolean; slot2?: boolean; slot3?: boolean }
	): void
	{
		if (this.classicManager.updatePlayerInput(socket, keys))
			return
		this.brManager.updatePlayerInput(socket, keys)
	}

	/**
	 * @brief Store ping value received from client
	 */
	public handlePing(socket: WebSocket, pingValue: number): void
	{
		if (this.classicManager.handlePing(socket, pingValue))
			return
		this.brManager.handlePing(socket, pingValue)
	}

	/**
	 * @brief Find game room by player socket
	 */
	public findGameByPlayer(socket: WebSocket): GameRoom | undefined
	{
		return this.classicManager.findGameByPlayer(socket)
	}

	/**
	 * @brief Check if a player name is in any active 1v1 game
	 */
	public isPlayerNameInGame(playerName: string): boolean
	{
		return this.classicManager.isPlayerInGame(playerName)
	}

	/**
	 * @brief Check if a player name is in any Battle Royale game
	 */
	public isPlayerNameInBattleRoyale(playerName: string): boolean
	{
		return this.brManager.isPlayerInGame(playerName)
	}

	/**
	 * @brief Get the socket of a player by name in any active game
	 */
	public getSocketByPlayerName(playerName: string): WebSocket | undefined
	{
		const classicSocket = this.classicManager.getSocketByPlayerName(playerName)
		if (classicSocket)
			return classicSocket
		return this.brManager.getSocketByPlayerName(playerName)
	}

	/**
	 * @brief Find Battle Royale game by player socket
	 */
	public findBattleRoyaleByPlayer(
		socket: WebSocket
	): { room: BattleRoyaleRoom; playerIndex: number } | undefined
	{
		return this.brManager.findByPlayer(socket)
	}

	/**
	 * @brief Handle player disconnection from Battle Royale
	 */
	public handleBattleRoyaleDisconnect(socket: WebSocket, isSurrender: boolean = false): boolean
	{
		return this.brManager.handleDisconnect(socket, isSurrender)
	}

	/**
	 * @brief End game and cleanup resources
	 */
	public endGame(gameId: string): void
	{
		this.classicManager.endGame(gameId)
	}

	/**
	 * @brief Get game state for spectating
	 */
	public getGameState(gameId: string): { players: Array<{ lives: number }> } | undefined
	{
		return this.classicManager.getGameState(gameId)
	}
}
