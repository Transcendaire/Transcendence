import { AIPlayer } from './AIPlayer.js'
import { Player } from '@app/shared/models/Player.js'
import { Ball } from '@app/shared/models/Ball.js'
import { canvasHeight, canvasWidth, paddleOffset } from '@app/shared/consts.js'

/**
 * @brief Easy AI implementation
 * @description Has a 1 frame delay in reaction time
 */
export class EasyAIPlayer extends AIPlayer
{
	constructor(
		playerId: 'player1' | 'player2',
		gameService: import('../game/game.js').GameService,
		inputState: {
			up: boolean
			down: boolean
			slot1?: boolean
			slot2?: boolean
			slot3?: boolean
		}
	)
	{
		super(playerId, gameService, inputState)
	}

    public decide(oldBallX: number, oldBallY: number, newBallX: number, newBallY: number,
        gameState: { player1: Player; player2: Player; ball: Ball })
    {
        if (this.isBallComing(oldBallX, newBallX))
        {
            this.targetY = this.calculateOptimalPosition(oldBallX, oldBallY, newBallX, newBallY)
            console.log('[AI] Ball coming, target Y:', this.targetY)
        }
        else
            this.goToMiddle()
    }

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
    
    public isBallComing(oldBallX: number, newBallX: number): boolean
    {
        return oldBallX - newBallX < 0
    }


    protected refreshAndDecide(): void
    {
        const gameState = this.gameService.getGameState()
        const currentBallX = gameState.ball.positionX
        const currentBallY = gameState.ball.positionY
        const deltaX = Math.abs(currentBallX - this.oldBallX)
        const deltaY = Math.abs(currentBallY - this.oldBallY)

        if (deltaX > 300 || deltaY > 300)
        {
            console.log('[AIPlayer] Ball reset detected')
            this.oldBallX = canvasWidth / 2
            this.oldBallY = canvasHeight / 2
        }
        this.decide(this.oldBallX, this.oldBallY, currentBallX, currentBallY, gameState)
        this.oldBallX = currentBallX
        this.oldBallY = currentBallY
    }
}
