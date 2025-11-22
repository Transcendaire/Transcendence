import { GameService } from '../game/game.js'
import { Player } from '@app/shared/models/Player.js'
import { Ball } from '@app/shared/models/Ball.js'
import { Paddle } from '@app/shared/models/Paddle.js'
import { canvasWidth, canvasHeight, paddleSize } from '@app/shared/consts.js'

/**
 * @brief Abstract base for AI opponents
 */
export abstract class AIPlayer
{
    protected playerId: 'player1' | 'player2'
    protected inputState: { up: boolean; down: boolean }
    protected gameService: GameService
    protected intervalId: NodeJS.Timeout | null
    protected movementIntervalId: NodeJS.Timeout | null
    protected oldBallX: number
    protected oldBallY: number
    protected targetY: number | null

    constructor(playerId: 'player1' | 'player2', gameService: GameService,
        inputState: { up: boolean; down: boolean })
    {
        this.playerId = playerId
        this.gameService = gameService
        this.inputState = inputState
        this.intervalId = null
        this.movementIntervalId = null
        this.oldBallX = canvasWidth / 2
        this.oldBallY = canvasHeight / 2
        this.targetY = null
    }

    /**
     * @brief Start AI decision and movement loops
     */
    public start(): void
    {
        this.intervalId = setInterval(() => this.refreshAndDecide(), 1000)
        this.movementIntervalId = setInterval(() => this.move(), (1000 / 60))
    }

    /**
     * @brief Stop loops and reset inputs
     */
    public stop(): void
    {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
        }
        if (this.movementIntervalId) {
            clearInterval(this.movementIntervalId)
            this.movementIntervalId = null
        }
        this.inputState.up = false
        this.inputState.down = false
    }

    /**
     * @brief Movement loop executed at 60FPS
     */
    protected move(): void
    {
        const gameState = this.gameService.getGameState()
        const paddle = this.playerId === 'player1' ? gameState.player1.paddle : gameState.player2.paddle
        const paddleCenter = paddle.positionY + paddleSize / 2
        const tolerance = 5

        if (this.targetY === null) {
            this.inputState.up = false
            this.inputState.down = false
            return
        }
        const distance = paddleCenter - this.targetY

        if (Math.abs(distance) < tolerance) {
            this.inputState.up = false
            this.inputState.down = false
            return
        }
        this.inputState.up = distance > 0
        this.inputState.down = distance < 0
    }

    public distanceToPoint(paddle: Paddle, point: number): number
    {
        return paddle.positionY + paddleSize / 2 - point
    }

    public calculateMoveTime(paddle: Paddle, targetY: number): number
    {
        const distance = Math.abs(this.distanceToPoint(paddle, targetY))
        const paddleSpeed = 400
        const timeNeeded = distance / paddleSpeed

        return timeNeeded
    }

    public goToPoint(paddle: Paddle, point: number): { up: boolean; down: boolean }
    {
        const dist = this.distanceToPoint(paddle, point)
        return { up: dist > 0, down: dist < 0 }
    }

    public goToMiddle(ai: Player): { up: boolean; down: boolean }
    {
        return this.goToPoint(ai.paddle, canvasHeight / 2)
    }

    public isBallComing(oldBallX: number, newBallX: number): boolean
    {
        return oldBallX - newBallX < 0
    }

    /**
     * @brief Abstract: refresh internal snapshot and compute new target
     */
    protected abstract refreshAndDecide(): void
}
