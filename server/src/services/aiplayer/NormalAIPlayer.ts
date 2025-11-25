import { AIPlayer } from './AIPlayer.js'
import { Player } from '@app/shared/models/Player.js'
import { Ball } from '@app/shared/models/Ball.js'
import {
	canvasWidth,
	canvasHeight,
	paddleOffset
} from '@app/shared/consts.js'

/**
 * @brief Normal AI using direct ball velocities from game state
 */
export class NormalAIPlayer extends AIPlayer
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

	protected refreshAndDecide(): void
	{
		const gameState = this.gameService.getGameState()
		const ball = gameState.ball
		if (!ball)
			return
		this.usePowerUps(gameState)
		this.decideUsingVelocity(ball)
	}

	private decideUsingVelocity(b: Ball): void
	{
		if (!this.isBallComing(b.velocityX))
			return this.goToMiddle()
		const targetX = this.playerId === 'player1'
			? paddleOffset + 10
			: canvasWidth - paddleOffset - 10
		const timeToTarget = (targetX - b.positionX) / b.velocityX
		if (!isFinite(timeToTarget) || timeToTarget <= 0)
			return this.goToMiddle()
		let predictedBallY = Math.abs(b.positionY + b.velocityY * timeToTarget)
		while (predictedBallY > canvasHeight || predictedBallY < 0)
		{
			if (predictedBallY > canvasHeight)
				predictedBallY = 2 * canvasHeight - predictedBallY
			else
				predictedBallY = -predictedBallY
		}
		this.targetY = predictedBallY
	}

	public isBallComing(vx: number): boolean
	{
		if (this.playerId === 'player1')
			return vx < 0
		return vx > 0
	}

	/**
	 * @brief Activate available power-ups through input simulation
	 *
	 * Simulates input for slots with available power-ups. We try to
	 * activate only when a slot currently contains a power-up and is
	 * not already selected.
	 */
	private usePowerUps(gameState: { player1: Player; player2: Player; ball: Ball }): void
	{
		const aiPlayer = this.playerId === 'player1'
			? gameState.player1
			: gameState.player2
		for (let slotIndex = 0; slotIndex < 3; slotIndex++)
		{
			const powerUp = aiPlayer.itemSlots[slotIndex]
			if (!powerUp || aiPlayer.selectedSlots[slotIndex])
				continue
			this.requestSlotActivation(slotIndex, 3)
		}
	}
}