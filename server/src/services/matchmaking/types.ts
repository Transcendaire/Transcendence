import { WebSocket } from 'ws'
import { GameService } from '../game/game.js'
import { AIPlayer } from '../AIPlayer.js'

/**
 * @brief Player connected to matchmaking system
 */
export interface Player
{
	socket: WebSocket
	name: string
	id: string
}

/**
 * @brief Active game room with running game loop
 */
export interface GameRoom
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
	tournamentMatch?: {
		tournamentId: string
		matchId: string
		isFinalMatch: boolean
		onComplete: (winnerId: string, score1: number, score2: number) => void
	}
}
