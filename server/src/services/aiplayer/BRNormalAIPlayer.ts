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
	private isInClassicMode: boolean

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
		this.isInClassicMode = false
	}

	/**
	 * @brief Override move for polygon paddle movement
	 */
	protected override move(): void
	{
		if (this.isInClassicMode)
		{
			super.move()
			return
		}

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

		if (!player.paddle.isPolygonMode())
		{
			this.isInClassicMode = true
			super.move()
			return
		}

		const paddle = player.paddle
		const currentPos = paddle.sidePosition
		const tolerance = 0.03

		if (this.targetSidePosition === null)
			this.targetSidePosition = 0.5

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
	 * @brief Override refreshAndDecide for polygon mode with multi-ball support
	 */
	protected override refreshAndDecide(): void
	{
		const gameState = this.gameService.getGameState()
		const player = gameState.players[this.brPlayerIndex]

		if (!player || player.isEliminated())
		{
			this.targetSidePosition = 0.5
			return
		}

		if (!player.paddle.isPolygonMode() || this.isInClassicMode)
		{
			this.isInClassicMode = true
			this.handleClassicModeDecision(gameState)
			return
		}

		this.useBRPowerUps(player)
		const sideStart = player.paddle.getSideStart()
		const sideEnd = player.paddle.getSideEnd()

		if (!sideStart || !sideEnd)
		{
			this.targetSidePosition = 0.5
			return
		}

		const threatBall = this.findMostThreateningBall(gameState, player, sideStart, sideEnd)
		if (threatBall)
			this.targetSidePosition = this.predictInterceptOnSegment(threatBall, sideStart, sideEnd)
		else
			this.targetSidePosition = this.findNearestBallPosition(gameState, player, sideStart, sideEnd)
	}

	/**
	 * @brief Handle decision making when switched to classic 2-player mode
	 */
	private handleClassicModeDecision(
		gameState: ReturnType<import('../game/game.js').GameService['getGameState']>
	): void
	{
		const activePlayers = gameState.players.filter(p => !p.isEliminated())
		if (activePlayers.length !== 2)
			return

		const myPlayerArrayIndex = activePlayers.findIndex(
			(_, idx) => gameState.players.indexOf(activePlayers[idx]!) === this.brPlayerIndex
		)
		if (myPlayerArrayIndex < 0)
			return

		const isOnLeft = activePlayers[myPlayerArrayIndex]!.paddle.positionX < 400
		const ball = gameState.ball
		if (!ball)
		{
			this.targetY = 300
			return
		}

		const ballComingToMe = isOnLeft ? ball.velocityX < 0 : ball.velocityX > 0
		if (!ballComingToMe)
		{
			this.targetY = 300
			return
		}

		const myPaddle = activePlayers[myPlayerArrayIndex]!.paddle
		const targetX = myPaddle.positionX + myPaddle.width / 2
		const timeToTarget = (targetX - ball.positionX) / ball.velocityX

		if (!isFinite(timeToTarget) || timeToTarget <= 0)
		{
			this.targetY = 300
			return
		}

		let predictedY = ball.positionY + ball.velocityY * timeToTarget
		const canvasH = 600
		while (predictedY > canvasH || predictedY < 0)
		{
			if (predictedY > canvasH)
				predictedY = 2 * canvasH - predictedY
			else
				predictedY = -predictedY
		}
		this.targetY = predictedY
	}

	/**
	 * @brief Find position of nearest ball when no threat detected
	 */
	private findNearestBallPosition(
		gameState: ReturnType<import('../game/game.js').GameService['getGameState']>,
		player: Player,
		sideStart: Point2D,
		sideEnd: Point2D
	): number
	{
		const allBalls: Ball[] = []
		if (gameState.balls && gameState.balls.length > 0)
			allBalls.push(...gameState.balls)
		else if (gameState.ball)
			allBalls.push(gameState.ball)

		if (allBalls.length === 0)
			return 0.5

		let nearestBall: Ball | null = null
		let nearestDist = Infinity
		const sideMidX = (sideStart.x + sideEnd.x) / 2
		const sideMidY = (sideStart.y + sideEnd.y) / 2

		for (const ball of allBalls)
		{
			const dist = Math.sqrt(
				Math.pow(ball.positionX - sideMidX, 2) +
				Math.pow(ball.positionY - sideMidY, 2)
			)
			if (dist < nearestDist)
			{
				nearestDist = dist
				nearestBall = ball
			}
		}

		if (nearestBall)
			return this.trackBallDirection(nearestBall, player)
		return 0.5
	}

	/**
	 * @brief Find the ball that poses the most threat to this player
	 */
	private findMostThreateningBall(
		gameState: ReturnType<import('../game/game.js').GameService['getGameState']>,
		player: Player,
		sideStart: Point2D,
		sideEnd: Point2D
	): Ball | null
	{
		const allBalls: Ball[] = []
		if (gameState.balls && gameState.balls.length > 0)
			allBalls.push(...gameState.balls)
		else if (gameState.ball)
			allBalls.push(gameState.ball)

		if (allBalls.length === 0)
			return null

		let bestBall: Ball | null = null
		let bestTimeToImpact = Infinity

		for (const ball of allBalls)
		{
			if (!this.isBallApproaching(ball, player))
				continue

			const timeToImpact = this.calculateTimeToImpact(ball, sideStart, sideEnd)
			if (timeToImpact !== null && timeToImpact >= 0 && timeToImpact < bestTimeToImpact)
			{
				if (this.willBallHitSide(ball, sideStart, sideEnd))
				{
					bestTimeToImpact = timeToImpact
					bestBall = ball
				}
			}
		}
		return bestBall
	}

	/**
	 * @brief Calculate time for ball to reach the side segment
	 */
	private calculateTimeToImpact(ball: Ball, sideStart: Point2D, sideEnd: Point2D): number | null
	{
		const dx = sideEnd.x - sideStart.x
		const dy = sideEnd.y - sideStart.y
		const denom = ball.velocityX * dy - ball.velocityY * dx
		if (Math.abs(denom) < 0.001)
			return null
		const t = ((sideStart.x - ball.positionX) * dy - (sideStart.y - ball.positionY) * dx) / denom
		if (t < 0)
			return null
		return t
	}

	/**
	 * @brief Check if ball trajectory will actually hit the side segment
	 */
	private willBallHitSide(ball: Ball, sideStart: Point2D, sideEnd: Point2D): boolean
	{
		const dx = sideEnd.x - sideStart.x
		const dy = sideEnd.y - sideStart.y
		const denom = ball.velocityX * dy - ball.velocityY * dx
		if (Math.abs(denom) < 0.001)
			return false
		const t = ((sideStart.x - ball.positionX) * dy - (sideStart.y - ball.positionY) * dx) / denom
		if (t < 0)
			return false
		const intersectX = ball.positionX + ball.velocityX * t
		const intersectY = ball.positionY + ball.velocityY * t
		const sideLength = Math.sqrt(dx * dx + dy * dy)
		if (sideLength === 0)
			return false
		const projLength = ((intersectX - sideStart.x) * dx + (intersectY - sideStart.y) * dy) / sideLength
		const normalizedPos = projLength / sideLength
		return normalizedPos >= -0.1 && normalizedPos <= 1.1
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
	 * @brief Override start for faster refresh rate in BR mode
	 */
	public override start(): void
	{
		this.intervalId = setInterval(() => this.refreshAndDecide(), 200)
		this.movementIntervalId = setInterval(() => this.move(), 1000 / 60)
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
