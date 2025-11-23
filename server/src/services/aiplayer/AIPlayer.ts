import { GameService } from '../game/game.js'
import { Player } from '@app/shared/models/Player.js'
import { Ball } from '@app/shared/models/Ball.js'
import { Paddle } from '@app/shared/models/Paddle.js'
import {
	canvasWidth,
	canvasHeight,
	paddleSize
} from '@app/shared/consts.js'

/**
 * @brief Abstract base for AI opponents
 *
 * Uses two loops: one for refreshing game view and deciding (once per
 * second), one for movement (60 times per second)
 */
export abstract class AIPlayer
{
	protected playerId: 'player1' | 'player2'
	protected inputState: {
		up: boolean
		down: boolean
		slot1?: boolean
		slot2?: boolean
		slot3?: boolean
	}
	protected gameService: GameService
	protected intervalId: ReturnType<typeof setInterval> | null
	protected movementIntervalId: ReturnType<typeof setInterval> | null
	protected oldBallX: number
	protected oldBallY: number
	protected targetY: number | null
	protected slotHoldCounters: number[] = [0, 0, 0]

	constructor(
		playerId: 'player1' | 'player2',
		gameService: GameService,
		inputState: {
			up: boolean
			down: boolean
			slot1?: boolean
			slot2?: boolean
			slot3?: boolean
		}
	)
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
		this.movementIntervalId = setInterval(() => this.move(), 1000 / 60)
	}

	/**
	 * @brief Stop loops and reset inputs
	 */
	public stop(): void
	{
		if (this.intervalId)
		{
			clearInterval(this.intervalId)
			this.intervalId = null
		}
		if (this.movementIntervalId)
		{
			clearInterval(this.movementIntervalId)
			this.movementIntervalId = null
		}
		this.stopMovement()
	}

	/**
	 * @brief Movement loop executed at 60 FPS
	 */
	protected move(): void
	{
		this.inputState.slot1 = false
		this.inputState.slot2 = false
		this.inputState.slot3 = false
		this.processSlotHold(0)
		this.processSlotHold(1)
		this.processSlotHold(2)
		const gameState = this.gameService.getGameState()
		const paddle = this.playerId === 'player1'
			? gameState.player1.paddle
			: gameState.player2.paddle
		const paddleCenter = paddle.positionY + paddleSize / 2
		const tolerance = 5
		if (this.targetY === null)
			return this.stopMovement()
		const distance = paddleCenter - this.targetY
		if (Math.abs(distance) < tolerance)
			return this.stopMovement()
		this.goToPoint(distance)
	}

	/**
	 * @brief Set input state based on distance from target
	 */
	public goToPoint(distance: number): void
	{
		this.inputState.up = distance > 0
		this.inputState.down = distance < 0
	}

	/**
	 * @brief Reset all movement and action inputs
	 */
	public stopMovement(): void
	{
		this.inputState.up = false
		this.inputState.down = false
		this.inputState.slot1 = false
		this.inputState.slot2 = false
		this.inputState.slot3 = false
		this.slotHoldCounters = [0, 0, 0]
	}

	/**
	 * @brief Set a slot input by index (0,1,2)
	 *
	 * Provides a single place to mutate slot inputs, avoiding
	 * repetition while preserving the existing `inputState` shape.
	 */
	protected setSlotInput(index: number, value: boolean): void
	{
		switch (index)
		{
			case 0:
				this.inputState.slot1 = value
				break
			case 1:
				this.inputState.slot2 = value
				break
			case 2:
				this.inputState.slot3 = value
				break
			default:
				break
		}
	}

	protected requestSlotActivation(index: number, frames: number = 3): void
	{
		if (index < 0 || index >= 3)
			return
		const current = this.slotHoldCounters[index] ?? 0
		this.slotHoldCounters[index] = Math.max(current, frames)
	}

	protected processSlotHold(index: number): void
	{
		const c = this.slotHoldCounters[index] ?? 0
		if (c <= 0)
			return
		this.setSlotInput(index, true)
		this.slotHoldCounters[index] = c - 1
	}

	/**
	 * @brief Calculate distance from paddle center to point
	 */
	public distanceToPoint(paddle: Paddle, point: number): number
	{
		return paddle.positionY + paddleSize / 2 - point
	}

	/**
	 * @brief Set target to middle of canvas
	 */
	public goToMiddle(): void
	{
		this.targetY = canvasHeight / 2
	}

	/**
	 * @brief Abstract: refresh internal snapshot and compute new target
	 */
	protected abstract refreshAndDecide(): void
}
