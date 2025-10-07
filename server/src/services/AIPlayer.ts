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

    // Fonction GoMiddle:
        // On est au milieu (en Y)?
            // up et down = false :
            // up ou down en direction du milieu

    // qu'un input?
        // Si oui GoMiddle :
        // Sinon Si la balle vient vers nous (velocite +x car le bot est a droite) ?
            // Si oui alors calculer le Y de la balle quand elle sera a X = this.canvasWidth(800) - paddleOffset(30) - 10, on y est?
                // Si oui up et down = false :
                // Sinon (up ou down) vers ce point:
            // Sinon GoMiddle
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
