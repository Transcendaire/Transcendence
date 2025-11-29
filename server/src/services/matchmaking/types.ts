import { WebSocket } from 'ws'
import { GameService } from '../game/game.js'
import { AIPlayer } from '../aiplayer/AIPlayer.js'
import { BRNormalAIPlayer } from '../aiplayer/BRNormalAIPlayer.js'

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
 * @brief Player input state for Battle Royale
 */
export interface PlayerInputState
{
	up: boolean
	down: boolean
	slot1?: boolean
	slot2?: boolean
	slot3?: boolean
}

/**
 * @brief Battle Royale player with socket and input tracking
 */
export interface BattleRoyalePlayer
{
	socket: WebSocket | null
	name: string
	id: string
	isBot: boolean
	input: PlayerInputState
	prevSlots: { slot1: boolean; slot2: boolean; slot3: boolean }
	ping: number
	ai?: BRNormalAIPlayer
}

/**
 * @brief Battle Royale game room for 3-6 players
 */
export interface BattleRoyaleRoom
{
	id: string
	players: BattleRoyalePlayer[]
	gameService: GameService
	gameLoop: NodeJS.Timeout | null
	isCustom: boolean
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
	player1Ping: number
	player2Ping: number
	ai?: AIPlayer
	isCustom: boolean
	tournamentMatch?: {
		tournamentId: string
		matchId: string
		isFinalMatch: boolean
		onComplete: (winnerId: string, score1: number, score2: number) => void
	}
}
