import { WebSocket } from 'ws'
import { GameState } from '../../../types.js'
import { sendMessage } from '../../../utils/websocket.js'

export interface GameOverOptions
{
	winner: 'player1' | 'player2' | 'player0'
	lives1: number
	lives2: number
	isTournament?: boolean
	isBattleRoyale?: boolean
	shouldDisconnect?: boolean
	forfeit?: boolean
	tournamentRemainingPlayers?: number
	tournamentTotalPlayers?: number
}

/**
 * @brief Send game over message to a player
 * @param socket Player's WebSocket
 * @param options Game over options
 */
export function sendGameOver(socket: WebSocket | null, options: GameOverOptions): void
{
	if (!socket)
		return
	sendMessage(socket, {
		type: 'gameOver',
		winner: options.winner as 'player1' | 'player2',
		lives1: options.lives1,
		lives2: options.lives2,
		isTournament: options.isTournament ?? false,
		isBattleRoyale: options.isBattleRoyale ?? false,
		shouldDisconnect: options.shouldDisconnect ?? true,
		...(options.forfeit && { forfeit: true }),
		...(options.tournamentRemainingPlayers !== undefined && { tournamentRemainingPlayers: options.tournamentRemainingPlayers }),
		...(options.tournamentTotalPlayers !== undefined && { tournamentTotalPlayers: options.tournamentTotalPlayers })
	})
}

/**
 * @brief Send game start message to a player
 * @param socket Player's WebSocket
 * @param playerRole Player's role
 * @param isCustom Whether it's a custom game
 * @param player1Name First player's name
 * @param player2Name Second player's name
 */
export function sendGameStart(
	socket: WebSocket | null,
	playerRole: 'player1' | 'player2',
	isCustom: boolean,
	player1Name: string,
	player2Name: string
): void
{
	if (!socket)
		return
	sendMessage(socket, {
		type: 'gameStart',
		playerRole,
		isCustom,
		player1Name,
		player2Name
	})
}

/**
 * @brief Send game state update to a player
 * @param socket Player's WebSocket
 * @param state Game state data
 */
export function sendGameState(socket: WebSocket | null, state: GameState): void
{
	if (!socket)
		return
	sendMessage(socket, { type: 'gameState', data: state })
}
