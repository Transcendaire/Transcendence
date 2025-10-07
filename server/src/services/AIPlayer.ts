import { GameService } from './main.js'
import { Player } from '../models/Player.js'
import { Ball } from '../models/Ball.js'

/**
 * @brief AI opponent for Pong game
 *
 * This class simulates a player by sending inputs to the server every second.
 */
export class AIPlayer
{
    private playerId: 'player1' | 'player2'
    private inputState: { up: boolean; down: boolean }
    private gameService: GameService
    private intervalId: NodeJS.Timeout | null = null

    constructor(playerId: 'player1' | 'player2', gameService: GameService,
        inputState: { up: boolean; down: boolean })
    {
        this.playerId = playerId
        this.gameService = gameService
        this.inputState = inputState
    }

    start()
    {
        this.intervalId = setInterval(() => {
            const gameState = this.gameService.getGameState()
            const input = this.decide(gameState)
            this.inputState.up = input.up
            this.inputState.down = input.down
        }, 1000)
    }

    decide(gameState: { player1: Player; player2: Player; ball: Ball })
    {
        return { up: true, down: false }
    }

    stop()
    {
        if (this.intervalId)
            clearInterval(this.intervalId)
    }
}
