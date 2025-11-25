import { Ball } from '@app/shared/models/Ball.js';
import { CloneBall } from '@app/shared/models/CloneBall.js';
import { speedBoost } from '@app/shared/consts.js';

/**
 * @brief Clone ball management utilities
 */
export class CloneBallManager
{
	/**
	 * @brief Create clone balls with angle variations
	 * @param cloneBalls Array to populate with clones
	 * @param ball Source ball to clone from
	 * @param count Number of clones to create
	 */
	public static create(cloneBalls: CloneBall[], ball: Ball, count: number): void
	{
		cloneBalls.length = 0;
		const ballDirection = Math.sign(ball.velocityX);
		const speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
		const speedBoostMultiplier = ball.isBoosted ? speedBoost : 1.0;
		const angleRange = ball.isCurving ? (2 * Math.PI) / 3 : Math.PI / 2;
		const angleStart = -angleRange / 2;
		const angleStep = angleRange / (count - 1);

		for (let i = 0; i < count; i++)
		{
			const angle = angleStart + angleStep * i;
			const vx = Math.cos(angle) * speed * ballDirection;
			const vy = Math.sin(angle) * speed;
			const clone = new CloneBall(ball.positionX, ball.positionY, vx, vy, speedBoostMultiplier);
			if (ball.isCurving)
				clone.applyCurve(ball.curveDirection);
			cloneBalls.push(clone);
		}
		console.log(`[GAME] Created ${count} clone balls`);
	}

	/**
	 * @brief Apply speed boost to all clone balls
	 * @param cloneBalls Array of clone balls
	 * @param multiplier Speed multiplier
	 */
	public static boost(cloneBalls: CloneBall[], multiplier: number): void
	{
		cloneBalls.forEach(clone => clone.applySpeedBoost(multiplier));
		console.log(`[GAME] Applied speed boost ${multiplier}x to ${cloneBalls.length} clone balls`);
	}

	/**
	 * @brief Apply curve to all clone balls
	 * @param cloneBalls Array of clone balls
	 * @param direction Direction of curve (1 = down, -1 = up)
	 */
	public static curve(cloneBalls: CloneBall[], direction: number): void
	{
		cloneBalls.forEach(clone => clone.applyCurve(direction));
		console.log(`[GAME] Applied curve direction ${direction} to ${cloneBalls.length} clone balls`);
	}

	/**
	 * @brief Clear all clone balls
	 * @param cloneBalls Array to clear
	 */
	public static clear(cloneBalls: CloneBall[]): void
	{
		cloneBalls.length = 0;
		console.log(`[GAME] Cleared all clone balls`);
	}

	/**
	 * @brief Update clone balls physics (wall bounces only)
	 * @param cloneBalls Array of clone balls
	 * @param deltaTime Time elapsed since last update
	 * @param canvasHeight Height of the game canvas
	 */
	public static update(cloneBalls: CloneBall[], deltaTime: number, canvasHeight: number): void
	{
		cloneBalls.forEach(clone => {
			clone.update(deltaTime);
			if (clone.positionY <= 0 || clone.positionY + clone.size >= canvasHeight)
			{
				clone.bounceVertical();
				if (clone.positionY <= 0)
					clone.positionY = 0;
				else if (clone.positionY + clone.size >= canvasHeight)
					clone.positionY = canvasHeight - clone.size;
			}
		});
	}
}
