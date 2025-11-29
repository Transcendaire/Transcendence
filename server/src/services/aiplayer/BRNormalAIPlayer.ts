import { NormalAIPlayer } from './NormalAIPlayer.js'
import { Ball } from '@app/shared/models/Ball.js'
import { Player } from '@app/shared/models/Player.js'
import { Point2D } from '@app/shared/types.js'

/**
 * @brief Battle Royale AI player extending NormalAIPlayer
 * 
 * Adapts NormalAIPlayer for polygon mode by calculating ball trajectory
 * intersection with the player's side segment.
 */
export class BRNormalAIPlayer extends NormalAIPlayer
{
	private brPlayerIndex: number
	private targetSidePosition: number | null

	constructor(
		playerIndex: number,
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
		super('player2', gameService, inputState)
		this.brPlayerIndex = playerIndex
		this.targetSidePosition = null
	}

	/**
	 * @brief Override move for polygon paddle movement
	 */
	protected override move(): void
	{
		this.inputState.slot1 = false
		this.inputState.slot2 = false
		this.inputState.slot3 = false
		this.processSlotHold(0)
		this.processSlotHold(1)
		this.processSlotHold(2)

		const gameState = this.gameService.getGameState()
		const player = gameState.players[this.brPlayerIndex]
		if (!player || player.isEliminated())
		{
			this.stopMovement()
			return
		}
		const paddle = player.paddle
		const currentPos = paddle.sidePosition
		const tolerance = 0.03
		if (this.targetSidePosition === null)
		{
			this.stopMovement()
			return
		}
		const distance = currentPos - this.targetSidePosition
		if (Math.abs(distance) < tolerance)
		{
			this.stopMovement()
			return
		}
		this.inputState.up = distance > 0
		this.inputState.down = distance < 0
	}

	/**
	 * @brief Override refreshAndDecide for polygon mode
	 */
	protected override refreshAndDecide(): void
	{
		const gameState = this.gameService.getGameState()
		const player = gameState.players[this.brPlayerIndex]
		if (!player || player.isEliminated())
		{
			this.targetSidePosition = null
			return
		}
		const ball = gameState.ball
		if (!ball)
		{
			this.targetSidePosition = 0.5
			return
		}
		this.useBRPowerUps(player)
		const sideStart = player.paddle.getSideStart()
		const sideEnd = player.paddle.getSideEnd()
		if (!sideStart || !sideEnd)
		{
			this.targetSidePosition = this.trackBallDirection(ball, player)
			return
		}
		if (this.isBallApproaching(ball, player))
			this.targetSidePosition = this.predictInterceptOnSegment(ball, sideStart, sideEnd)
		else
			this.targetSidePosition = this.trackBallDirection(ball, player)
	}

	/**
	 * @brief Track ball direction when not approaching (go towards ball)
	 * @param ball Ball object
	 * @param player Player object
	 * @returns Target position along side (0-1)
	 */
	private trackBallDirection(ball: Ball, player: Player): number
	{
		const sideStart = player.paddle.getSideStart()
		const sideEnd = player.paddle.getSideEnd()
		if (!sideStart || !sideEnd)
			return 0.5
		const sideAngle = player.paddle.angle
		const sideMidX = (sideStart.x + sideEnd.x) / 2
		const sideMidY = (sideStart.y + sideEnd.y) / 2
		const ballOffset =
			(ball.positionX - sideMidX) * Math.cos(sideAngle) +
			(ball.positionY - sideMidY) * Math.sin(sideAngle)
		const sideLength = Math.sqrt(
			Math.pow(sideEnd.x - sideStart.x, 2) +
			Math.pow(sideEnd.y - sideStart.y, 2)
		)
		let normalizedPos = 0.5 + (ballOffset / sideLength)
		return Math.max(0.15, Math.min(0.85, normalizedPos))
	}

	/**
	 * @brief Check if ball is approaching this player's side
	 * @param ball Ball object
	 * @param player Player object
	 * @returns True if ball is moving towards this side
	 */
	private isBallApproaching(ball: Ball, player: Player): boolean
	{
		const paddle = player.paddle
		const paddleAngle = paddle.angle
		const sideNormalAngle = paddleAngle + Math.PI / 2
		const velDotNormal =
			ball.velocityX * Math.cos(sideNormalAngle) +
			ball.velocityY * Math.sin(sideNormalAngle)
		return velDotNormal > 0.1
	}

	/**
	 * @brief Predict where ball will intersect the side segment using velocity
	 * @param ball Ball object
	 * @param sideStart Start point of side segment
	 * @param sideEnd End point of side segment
	 * @returns Target position along side (0-1)
	 */
	private predictInterceptOnSegment(ball: Ball, sideStart: Point2D, sideEnd: Point2D): number
	{
		const dx = sideEnd.x - sideStart.x
		const dy = sideEnd.y - sideStart.y
		const denom = ball.velocityX * dy - ball.velocityY * dx
		if (Math.abs(denom) < 0.001)
			return 0.5
		const t = ((sideStart.x - ball.positionX) * dy - (sideStart.y - ball.positionY) * dx) / denom
		if (t < 0)
			return 0.5
		const intersectX = ball.positionX + ball.velocityX * t
		const intersectY = ball.positionY + ball.velocityY * t
		const sideLength = Math.sqrt(dx * dx + dy * dy)
		if (sideLength === 0)
			return 0.5
		const projLength =
			((intersectX - sideStart.x) * dx + (intersectY - sideStart.y) * dy) / sideLength
		let normalizedPos = projLength / sideLength
		return Math.max(0.1, Math.min(0.9, normalizedPos))
	}

	/**
	 * @brief Activate available power-ups for Battle Royale player
	 * @param player Player object
	 */
	private useBRPowerUps(player: Player): void
	{
		if (!player.itemSlots)
			return
		for (let slotIndex = 0; slotIndex < 3; slotIndex++)
		{
			const powerUp = player.itemSlots[slotIndex]
			if (!powerUp || player.selectedSlots[slotIndex])
				continue
			this.requestSlotActivation(slotIndex, 3)
		}
	}
}
