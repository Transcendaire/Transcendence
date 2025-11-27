import { Player } from '@app/shared/models/Player.js';
import { Ball } from '@app/shared/models/Ball.js';
import { PowerUpFruit, PolygonData, Point2D } from '@app/shared/types.js';
import { PowerUpManager } from './powerUps.js';

/**
 * @brief Fruit management utilities
 */
export class FruitManager
{
	/**
	 * @brief Spawn power-up fruit at random position inside play area
	 * @param fruits Array to add fruit to
	 * @param canvasWidth Width of the game canvas
	 * @param canvasHeight Height of the game canvas
	 * @param polygonData Optional polygon data for BR mode
	 */
	public static spawn(
		fruits: PowerUpFruit[],
		canvasWidth: number,
		canvasHeight: number,
		polygonData?: PolygonData | null
	): void
	{
		let x: number, y: number;

		if (polygonData)
		{
			const pos = this.getRandomPointInPolygon(polygonData);
			x = pos.x;
			y = pos.y;
		}
		else
		{
			const minX = canvasWidth * 0.25;
			const maxX = canvasWidth * 0.75;
			const minY = 50;
			const maxY = canvasHeight - 50;
			x = minX + Math.random() * (maxX - minX);
			y = minY + Math.random() * (maxY - minY);
		}

		const fruit: PowerUpFruit = {
			id: Math.random().toString(36).substr(2, 9),
			x,
			y,
			rotation: 0
		};
		fruits.push(fruit);
		console.log(`[GAME] Spawned fruit at (${fruit.x.toFixed(0)}, ${fruit.y.toFixed(0)})`);
	}

	/**
	 * @brief Get random point inside a polygon
	 * @param polygonData Polygon data with center and radius
	 * @returns Random point inside the polygon
	 */
	private static getRandomPointInPolygon(polygonData: PolygonData): Point2D
	{
		const { center, radius, vertices } = polygonData;
		const safeRadius = radius * 0.6;

		for (let attempt = 0; attempt < 50; attempt++)
		{
			const angle = Math.random() * Math.PI * 2;
			const dist = Math.random() * safeRadius;
			const x = center.x + Math.cos(angle) * dist;
			const y = center.y + Math.sin(angle) * dist;

			if (this.isPointInPolygon({ x, y }, vertices))
				return { x, y };
		}

		return { x: center.x, y: center.y };
	}

	/**
	 * @brief Check if point is inside polygon using ray casting
	 * @param point Point to check
	 * @param vertices Polygon vertices
	 * @returns True if point is inside
	 */
	private static isPointInPolygon(point: Point2D, vertices: Point2D[]): boolean
	{
		let inside = false;
		const n = vertices.length;

		for (let i = 0, j = n - 1; i < n; j = i++)
		{
			const vi = vertices[i]!;
			const vj = vertices[j]!;

			if (((vi.y > point.y) !== (vj.y > point.y)) &&
				(point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x))
			{
				inside = !inside;
			}
		}

		return inside;
	}

	/**
	 * @brief Relocate all fruits to be inside new polygon shape
	 * @param fruits Array of fruits to relocate
	 * @param polygonData New polygon data
	 */
	public static relocateFruits(fruits: PowerUpFruit[], polygonData: PolygonData): void
	{
		for (const fruit of fruits)
		{
			if (!this.isPointInPolygon({ x: fruit.x, y: fruit.y }, polygonData.vertices))
			{
				const newPos = this.getRandomPointInPolygon(polygonData);
				fruit.x = newPos.x;
				fruit.y = newPos.y;
				console.log(`[GAME] Relocated fruit to (${fruit.x.toFixed(0)}, ${fruit.y.toFixed(0)})`);
			}
		}
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
