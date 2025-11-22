import { AIPlayer } from './AIPlayer.js'
import { Player } from '@app/shared/models/Player.js'
import { Ball } from '@app/shared/models/Ball.js'
import { canvasWidth, canvasHeight, paddleOffset } from '@app/shared/consts.js'

/**
 * @brief Better AI using direct ball velocities from game state
 */
export class GoodAIPlayer extends AIPlayer
{
    constructor(playerId: 'player1' | 'player2', gameService: import('../game/game.js').GameService,
        inputState: { up: boolean; down: boolean })
    {
        super(playerId, gameService, inputState)
    }

    protected refreshAndDecide(): void
    {
        const gameState = this.gameService.getGameState()
        const ball = gameState.ball

        if (!ball)
            return

        const vx = ball.velocityX
        const vy = ball.velocityY

        if (Math.abs(vx) < 0.0001 && Math.abs(vy) < 0.0001) {
            this.targetY = canvasHeight / 2
            return
        }

        if (Math.abs(ball.positionX - canvasWidth/2) > 500) {
            this.oldBallX = canvasWidth / 2
            this.oldBallY = canvasHeight / 2
        }

        this.decideUsingVelocity(ball.positionX, ball.positionY, vx, vy, gameState)
    }

    private decideUsingVelocity(ballX: number, ballY: number, vx: number, vy: number,
        gameState: { player1: Player; player2: Player; ball: Ball })
    {

        const targetX = this.playerId === 'player1' ? paddleOffset + 10 : canvasWidth - paddleOffset - 10
        const timeToTarget = (targetX - ballX) / vx
        if (!isFinite(timeToTarget) || timeToTarget <= 0) {
            this.targetY = canvasHeight / 2
            return
        }
        let predictedY = ballY + vy * timeToTarget
        predictedY = Math.abs(predictedY) % (2 * canvasHeight)
        this.targetY = predictedY
    }

    public calculateOptimalPosition(_oldBallX: number, _oldBallY: number,
        _newBallX: number, _newBallY: number) : number
    {
        const gameState = this.gameService.getGameState()
        const ball = gameState.ball
        const vx = ball.velocityX
        const vy = ball.velocityY
        const targetX = this.playerId === 'player1' ? paddleOffset + 10 : canvasWidth - paddleOffset - 10

        if (Math.abs(vx) < 0.0001)
            return canvasHeight / 2

        const timeToTarget = (targetX - ball.positionX) / vx
        if (!isFinite(timeToTarget) || timeToTarget <= 0)
            return canvasHeight / 2

        let predictedY = ball.positionY + vy * timeToTarget
        predictedY = Math.abs(predictedY) % (2 * canvasHeight)
        return predictedY
    }

    public goToPredictedBallPosition(oldBall: Ball, newBall: Ball, ai: Player): { up: boolean; down: boolean }
    {
        const predicted = this.calculateOptimalPosition(oldBall.positionX, oldBall.positionY, newBall.positionX, newBall.positionY)
        return this.goToPoint(ai.paddle, predicted)
    }

    public override isBallComing(vx: number): boolean
    {
         if (this.playerId === 'player1')
            return vx < 0
        return vx > 0
    }


    public decide(oldBallX: number, oldBallY: number, newBallX: number, newBallY: number,
        gameState: { player1: Player; player2: Player; ball: Ball })
    {
        const ball = gameState.ball
        if (!this.isBallComing(ball.velocityX)) {
            this.targetY = canvasHeight / 2
            return
        }
        this.decideUsingVelocity(ball.positionX, ball.positionY, ball.velocityX, ball.velocityY, gameState)
    }
}
