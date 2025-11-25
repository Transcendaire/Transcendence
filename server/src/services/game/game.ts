import { Player } from "@app/shared/models/Player.js";
import { Ball } from "@app/shared/models/Ball.js";
import { CloneBall } from "@app/shared/models/CloneBall.js";
import { PowerUpFruit } from "@app/shared/types.js";
import { paddleOffset, FRUIT_FREQUENCY, maxScore as defaultMaxScore } from "@app/shared/consts.js";
import { CloneBallManager } from "./cloneBalls.js";
import { FruitManager } from "./fruits.js";
import { CollisionManager } from "./collisions.js";

export type PlayerInput = {
	up: boolean
	down: boolean
	slot1?: boolean
	slot2?: boolean
	slot3?: boolean
}

/**
 * @brief Game logic service handling gameplay mechanics
 */
export class GameService
{
	public players: Player[];
	public ball!: Ball;
	public cloneBalls: CloneBall[];
	public fruits: PowerUpFruit[];
	public fruitSpawnTimer: number;
	public ballTouched: boolean;
	public lastTouchedPlayerIndex: number;
	public readonly fruitSpawnInterval: number;
	public readonly maxFruits: number;
	public readonly maxScore: number;
	public readonly canvasWidth: number;
	public readonly canvasHeight: number;
	public readonly isCustomMode: boolean;

	/**
	 * @brief Constructor
	 * @param canvasWidth Width of the game canvas
	 * @param canvasHeight Height of the game canvas
	 * @param isCustomMode Enable custom mode with power-ups
	 * @param fruitFrequency Frequency of fruit spawning
	 * @param maxScore Maximum score to win the game
	 * @param playerCount Number of players (2-5)
	 */
	constructor(
		canvasWidth: number,
		canvasHeight: number,
		isCustomMode: boolean = false,
		fruitFrequency: 'low' | 'normal' | 'high' = 'normal',
		maxScore: number = defaultMaxScore,
		playerCount: number = 2
	)
	{
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.isCustomMode = isCustomMode;
		this.players = [];
		this.cloneBalls = [];
		this.fruits = [];
		this.fruitSpawnTimer = 0;
		this.ballTouched = false;
		this.lastTouchedPlayerIndex = -1;
		this.fruitSpawnInterval = FRUIT_FREQUENCY[fruitFrequency];
		this.maxFruits = fruitFrequency === 'low' ? 2 : fruitFrequency === 'normal' ? 4 : 7;
		this.maxScore = maxScore;
		this.initGame(playerCount);
	}

	/**
	 * @brief Initialize game objects with default positions
	 * @param playerCount Number of players
	 */
	private initGame(playerCount: number): void
	{
		this.players = [];
		this.players.push(new Player("Player 1", paddleOffset));
		this.players.push(new Player("Player 2", this.canvasWidth - paddleOffset - 10));
		this.ball = new Ball(this.canvasWidth / 2, this.canvasHeight / 2);
	}

	/**
	 * @brief Get current game state
	 * @returns Object containing players array, ball, and clones
	 */
	public getGameState(): { players: Player[]; ball: Ball; cloneBalls: CloneBall[]; fruits: PowerUpFruit[] }
	{
		return {
			players: this.players,
			ball: this.ball,
			cloneBalls: this.cloneBalls,
			fruits: this.fruits
		};
	}

	/**
	 * @brief Get player by index
	 * @param index Player index (0-based)
	 * @returns Player at index or undefined
	 */
	public getPlayer(index: number): Player | undefined
	{
		return this.players[index];
	}

	/**
	 * @brief Get number of active players
	 * @returns Number of players
	 */
	public getPlayerCount(): number
	{
		return this.players.length;
	}


	/**
	 * @brief Update game state based on player inputs
	 * @param deltaTime Time elapsed since last update
	 * @param inputs Array of player inputs (indexed by player)
	 * @returns True if game should end (max score reached)
	 */
	public updateGame(deltaTime: number, inputs: PlayerInput[]): boolean
	{
		for (let i = 0; i < this.players.length; i++)
		{
			const player = this.players[i];
			if (!player)
				continue;
			const input = inputs[i] || { up: false, down: false };
			if (input.up)
				player.paddle.moveUp(deltaTime, this.canvasHeight);
			if (input.down)
				player.paddle.moveDown(deltaTime, this.canvasHeight);
			if (this.isCustomMode)
			{
				const slots = [input.slot1, input.slot2, input.slot3];
				for (let slotIndex = 0; slotIndex < slots.length; slotIndex++)
				{
					if (slots[slotIndex])
					{
						if (player.selectedSlots[slotIndex])
							player.cancelPowerUp(slotIndex);
						else
							player.activatePowerUp(slotIndex);
					}
				}
			}
		}
		this.ball.update(deltaTime);
		CloneBallManager.update(this.cloneBalls, deltaTime, this.canvasHeight);
		if (this.isCustomMode)
		{
			this.fruitSpawnTimer += deltaTime;
			if (this.fruitSpawnTimer >= this.fruitSpawnInterval)
			{
				if (this.fruits.length < this.maxFruits)
					FruitManager.spawn(this.fruits, this.canvasWidth, this.canvasHeight);
				this.fruitSpawnTimer = 0;
			}
			FruitManager.checkCollisions(this.fruits, this.ball, this.players, this.ballTouched, this.lastTouchedPlayerIndex);
		}
		const [gameOver, lastTouch] = CollisionManager.checkAll(
			this.players,
			this.ball,
			this.cloneBalls,
			this.canvasWidth,
			this.canvasHeight,
			this.isCustomMode,
			this.maxScore
		);
		if (lastTouch >= 0)
		{
			this.ballTouched = true;
			this.lastTouchedPlayerIndex = lastTouch;
		}
		return gameOver;
	}
}
