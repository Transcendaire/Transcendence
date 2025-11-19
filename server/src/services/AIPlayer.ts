import { GameService } from './game/game.js' 
import { Player } from '@app/shared/models/Player.js'
import { Ball } from '@app/shared/models/Ball.js'
import { Paddle } from '@app/shared/models/Paddle.js'
import { canvasWidth, canvasHeight, paddleSize, paddleOffset} from '@app/shared/consts.js'

/**
 * @brief AI opponent for Pong game
 * @details Simulates player by making decisions every second and
 * applying continuous movement at 60 FPS
 * (informations still refreshs every second)
 */
export class AIPlayer
{
    private playerId: 'player1' | 'player2'
    private inputState: { up: boolean; down: boolean }
    private gameService: GameService
    private intervalId: NodeJS.Timeout | null
    private movementIntervalId: NodeJS.Timeout | null
    private oldBallX: number
    private oldBallY: number
    private targetY: number | null

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
     * @details Decision loop runs at 1 Hz, movement update at 60 Hz
     */
    public start(): void
    {
        console.log('[AIPlayer] AI started');
        this.intervalId = setInterval(() => {
            const gameState = this.gameService.getGameState();
            const currentBallX = gameState.ball.positionX;
            const currentBallY = gameState.ball.positionY;
            const deltaX = Math.abs(currentBallX - this.oldBallX);
            const deltaY = Math.abs(currentBallY - this.oldBallY);

            if (deltaX > 300 || deltaY > 300) {
                console.log('[AIPlayer] Ball reset detected');
                this.oldBallX = canvasWidth / 2;
                this.oldBallY = canvasHeight / 2;
            }
            this.decide(this.oldBallX, this.oldBallY, currentBallX, currentBallY, gameState);
            this.oldBallX = currentBallX;
            this.oldBallY = currentBallY;
        }, 1000);
        this.movementIntervalId = setInterval(() => {
            this.updateMovement();
        }, (1000/60));
    }

    /**
     * @brief Stop AI decision and movement loops
     */
    public stop(): void
    {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.movementIntervalId) {
            clearInterval(this.movementIntervalId);
            this.movementIntervalId = null;
        }
        this.inputState.up = false;
        this.inputState.down = false;
        console.log('[AIPlayer] AI stopped');
    }

    /**
     * @brief AI decision-making algorithm
     * @param oldBallX Previous ball X position
     * @param oldBallY Previous ball Y position
     * @param newBallX Current ball X position
     * @param newBallY Current ball Y position
     * @param gameState Current game state
     * @details Decides target Y based on ball trajectory
     */
    decide(oldBallX: number, oldBallY: number, newBallX: number, newBallY: number,
        gameState: { player1: Player; player2: Player; ball: Ball })
    {
        if (this.isBallComing(oldBallX, newBallX)) {
            this.targetY = this.calculateOptimalPosition(oldBallX, oldBallY, newBallX, newBallY);
            console.log('[AI] Ball coming, target Y:', this.targetY);
        }
        else {
            this.targetY = canvasHeight / 2;
            console.log('[AI] Ball going away, going to middle');
        }
    }

    /**
     * @brief Update paddle movement continuously
     * @details Runs at 60 FPS to apply inputs towards target position
     */
    private updateMovement(): void
    {
        const gameState = this.gameService.getGameState();
        const paddle = this.playerId === 'player1' ? gameState.player1.paddle : gameState.player2.paddle;
        const paddleCenter = paddle.positionY + paddleSize / 2;
        const tolerance = 5;

        if (this.targetY === null) {
            this.inputState.up = false;
            this.inputState.down = false;
            return;
        }
        const distance = paddleCenter - this.targetY;

        if (Math.abs(distance) < tolerance) {
            this.inputState.up = false;
            this.inputState.down = false;
            return;
        }
        this.inputState.up = distance > 0;
        this.inputState.down = distance < 0;
    }

    /**
     * @brief Calculate distance from paddle center to target
     * @param paddle Paddle object
     * @param point Target Y coordinate
     * @returns Signed distance (positive means paddle above target)
     */
    public distanceToPoint(paddle: Paddle, point: number): number
    {
        return paddle.positionY + paddleSize / 2 - point
    }

    /**
     * @brief Calculate time to reach target
     * @param paddle Paddle object
     * @param targetY Target Y coordinate
     * @returns Time in seconds
     */
    public calculateMoveTime(paddle: Paddle, targetY: number): number
    {
        const distance = Math.abs(this.distanceToPoint(paddle, targetY))
        const paddleSpeed = 400
        const timeNeeded = distance / paddleSpeed

        return timeNeeded
    }

    /**
     * @brief Move paddle towards target point
     * @param paddle Paddle object
     * @param point Target Y coordinate
     * @returns Input commands
     */
    public goToPoint(paddle: Paddle, point: number): { up: boolean; down: boolean }
    {
        const dist = this.distanceToPoint(paddle, point)

        console.log('[AI] Moving towards', point, 'Distance:', dist.toFixed(2))
        return { up: dist > 0, down: dist < 0 }
    }

    /**
     * @brief Move paddle to center
     * @param ai AI player object
     * @returns Input commands
     */
    public goToMiddle(ai: Player): { up: boolean; down: boolean }
    {
        return this.goToPoint(ai.paddle, canvasHeight/2)
    }

    /**
     * @brief Check if ball is moving towards AI
     * @param oldBallX Previous ball X position
     * @param newBallX Current ball X position
     * @returns True if ball moving right (towards player2)
     */
    public isBallComing(oldBallX: number, newBallX: number): boolean
    {
        return oldBallX - newBallX < 0
    }

    /**
     * @brief Predict ball Y when it reaches paddle X
     * @param oldBallX Previous ball X position
     * @param oldBallY Previous ball Y position
     * @param newBallX Current ball X position
     * @param newBallY Current ball Y position
     * @returns Predicted Y coordinate
     */
    public calculateOptimalPosition(oldBallX: number, oldBallY: number,
        newBallX: number, newBallY: number) : number
    {
        const velX = newBallX - oldBallX
        const velY = newBallY - oldBallY
        const targetX = canvasWidth - paddleOffset - 10
        let predictedBallY = oldBallY + (velY / velX) * (targetX - oldBallX)

        predictedBallY = Math.abs(predictedBallY) % (2 * canvasHeight)
        console.log('[AI] Predicted ball Y:', predictedBallY, 'velX:', velX, 'velY:', velY)
        return predictedBallY
    }

    /**
     * @brief Move to predicted ball position
     * @param oldBall Previous ball state
     * @param newBall Current ball state
     * @param ai AI player object
     * @returns Input commands
     */
    public goToPredictedBallPosition(oldBall: Ball, newBall: Ball, ai: Player): { up: boolean; down: boolean }
    {
        return this.goToPoint(ai.paddle, this.calculateOptimalPosition(oldBall.positionX, oldBall.positionY, newBall.positionX, newBall.positionY))
    }
}


