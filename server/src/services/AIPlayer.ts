import { GameService } from './main.js'
import { Player } from '../models/Player.js'
import { Ball } from '../models/Ball.js'
import { Paddle } from '../models/Paddle.js'
import { canvasWidth, canvasHeight, paddleSize, paddleOffset} from '../consts.js'

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
    private oldGameState: { player1: Player; player2: Player; ball: Ball } | null = null
    private stopMoveTimeout: NodeJS.Timeout | null = null

    constructor(playerId: 'player1' | 'player2', gameService: GameService,
        inputState: { up: boolean; down: boolean })
    {
        this.playerId = playerId
        this.gameService = gameService
        this.inputState = inputState
    }

    /**
     * @brief Start AI decision loop with 1-second interval
     */
    start()
    {
        this.intervalId = setInterval(() => {
            const newGameState = this.gameService.getGameState()
            const input = this.decide(this.oldGameState, newGameState)
            
            console.log('[AI] Ball position:', {
                old: this.oldGameState?.ball.positionX, 
                new: newGameState.ball.positionX,
                oldY: this.oldGameState?.ball.positionY,
                newY: newGameState.ball.positionY
            })
            console.log('[AI] Decision:', input, 'Paddle Y:', newGameState.player2.paddle.positionY)
            
            this.inputState.up = input.up
            this.inputState.down = input.down
            this.oldGameState = JSON.parse(JSON.stringify(newGameState))
        }, 1000)
    }

    /**
     * @brief AI decision-making algorithm for paddle movement
     * @param oldGameState Previous game state (null on first tick)
     * @param newGameState Current game state
     * @returns Input commands for paddle movement
     * @details Decision tree:
     * - If no previous state exists: return to middle position
     * - If ball is moving towards AI (velocityX > 0):
     *   - Calculate predicted ball Y position when it reaches paddle X
     *   - If paddle is already at predicted position: hold position
     *   - Otherwise: move towards predicted position
     * - If ball is moving away: return to middle position
     */
    decide(oldGameState: { player1: Player; player2: Player; ball: Ball } | null,
        newGameState: { player1: Player; player2: Player; ball: Ball })
    {
        if (!oldGameState)
            return this.goToMiddle(newGameState.player2)
        if (this.isBallComing(oldGameState.ball, newGameState.ball))
            return this.goToPredictedBallPosition(oldGameState.ball, newGameState.ball, newGameState.player2)
        else
            return this.goToMiddle(newGameState.player2)
    }

    /**
     * @brief Stop AI decision loop
     */
    stop()
    {
        if (this.intervalId)
            clearInterval(this.intervalId)
    }

    /**
     * @brief Calculate distance from paddle center to target point
     * @param paddle Paddle object
     * @param point Target Y coordinate
     * @returns Signed distance (positive = paddle above target)
     */
    public distanceToPoint(paddle: Paddle, point: number): number
    {
        return paddle.positionY + paddleSize / 2 - point
    }

    /**
     * @brief Calculate time needed to reach target position
     * @param paddle Paddle object
     * @param targetY Target Y coordinate
     * @returns Time in seconds (capped at 1.0)
     */
    public calculateMoveTime(paddle: Paddle, targetY: number): number
    {
        const distance = Math.abs(this.distanceToPoint(paddle, targetY))
        const paddleSpeed = 400
        const timeNeeded = distance / paddleSpeed
        
        return Math.min(timeNeeded, 1.0)
    }

    /**
     * @brief Move paddle towards target point
     * @param paddle Paddle object
     * @param point Target Y coordinate
     * @returns Input commands and schedules automatic stop
     */
    public goToPoint(paddle: Paddle, point: number): { up: boolean; down: boolean }
    {
        const dist = this.distanceToPoint(paddle, point)
        const tolerance = 5
        
        if (Math.abs(dist) < tolerance)
            return { up: false, down: false }
        const moveTime = this.calculateMoveTime(paddle, point)
        
        if (this.stopMoveTimeout)
            clearTimeout(this.stopMoveTimeout)
        this.stopMoveTimeout = setTimeout(() => {
            this.inputState.up = false
            this.inputState.down = false
            console.log('[AI] Stopped moving')
        }, moveTime * 1000)
        console.log('[AI] Moving for', moveTime, 'seconds. Distance:', dist)
        return { up: dist > 0, down: dist < 0 }
    }

    /**
     * @brief Move paddle to center of canvas
     * @param ai AI player object
     * @returns Input commands
     */
    public goToMiddle(ai: Player): { up: boolean; down: boolean }
    {
        return this.goToPoint(ai.paddle, canvasHeight/2)
    }

    /**
     * @brief Check if ball is moving towards AI paddle
     * @param oldBall Previous ball state
     * @param newBall Current ball state
     * @returns True if ball X velocity is positive
     */
    public isBallComing(oldBall: Ball, newBall: Ball): boolean
    {
        return oldBall.positionX - newBall.positionX < 0
    }

    /**
     * @brief Predict ball Y position when it reaches paddle X
     * @param oldBall Previous ball state
     * @param newBall Current ball state
     * @returns Predicted Y coordinate with bounce simulation
     * @details Uses linear trajectory and modulo for wall bounces
     */
    public calculateOptimalPosition(oldBall: Ball, newBall: Ball) : number
    {
        const velX = newBall.positionX - oldBall.positionX
        const velY = newBall.positionY - oldBall.positionY
        const targetX = canvasWidth - paddleOffset - 10
        let predictedBallY = oldBall.positionY + (velY / velX) * (targetX - oldBall.positionX)
        
        predictedBallY = Math.abs(predictedBallY) % (2 * canvasHeight)
        if (predictedBallY > canvasHeight)
            predictedBallY = 2 * canvasHeight - predictedBallY
        console.log('[AI] Predicted ball Y:', predictedBallY, 'velX:', velX, 'velY:', velY)
        return predictedBallY
    }

    /**
     * @brief Move paddle to predicted ball interception point
     * @param oldBall Previous ball state
     * @param newBall Current ball state
     * @param ai AI player object
     * @returns Input commands
     */
    public goToPredictedBallPosition(oldBall: Ball, newBall: Ball, ai: Player): { up: boolean; down: boolean }
    {
        return this.goToPoint(ai.paddle, this.calculateOptimalPosition(oldBall, newBall))
    }

}


