import { Player } from '@app/shared/models/Player.js';
import { Ball } from '@app/shared/models/Ball.js';
import { PowerUpFruit } from '@app/shared/types.js';
import { PowerUpManager } from './powerUps.js';

/**
 * @brief Fruit management utilities
 */
export class FruitManager
{
	/**
	 * @brief Spawn power-up fruit at random middle position
	 * @param fruits Array to add fruit to
	 * @param canvasWidth Width of the game canvas
	 * @param canvasHeight Height of the game canvas
	 */
	public static spawn(fruits: PowerUpFruit[], canvasWidth: number, canvasHeight: number): void
	{
		const minX = canvasWidth * 0.25;
		const maxX = canvasWidth * 0.75;
		const minY = 50;
		const maxY = canvasHeight - 50;
		const fruit: PowerUpFruit = {
			id: Math.random().toString(36).substr(2, 9),
			x: minX + Math.random() * (maxX - minX),
			y: minY + Math.random() * (maxY - minY),
			rotation: 0
		};
		fruits.push(fruit);
		console.log(`[GAME] Spawned fruit at (${fruit.x.toFixed(0)}, ${fruit.y.toFixed(0)})`);
	}

	/**
	 * @brief Check ball collision with fruits and award bonus
	 * @param fruits Array of fruits
	 * @param ball Game ball
	 * @param players Array of players
	 * @param ballTouched Whether ball was recently touched
	 * @param lastTouchedPlayerIndex Index of last player to touch ball
	 */
	public static checkCollisions(
		fruits: PowerUpFruit[],
		ball: Ball,
		players: Player[],
		ballTouched: boolean,
		lastTouchedPlayerIndex: number
	): void
	{
		const ballSize = ball.size;
		const fruitSize = 30;

		for (let i = fruits.length - 1; i >= 0; i--)
		{
			const fruit = fruits[i];
			if (!fruit)
				continue;
			const collides = (
				ball.positionX < fruit.x + fruitSize &&
				ball.positionX + ballSize > fruit.x &&
				ball.positionY < fruit.y + fruitSize &&
				ball.positionY + ballSize > fruit.y
			);
			if (collides && ballTouched && lastTouchedPlayerIndex >= 0)
			{
				const player = players[lastTouchedPlayerIndex];
				if (player)
				{
					PowerUpManager.awardFruitBonus(player);
					fruits.splice(i, 1);
					console.log(`[GAME] ${player.name} collected fruit`);
				}
			}
		}
	}
}
