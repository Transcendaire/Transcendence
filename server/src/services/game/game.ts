import { Player } from "@app/shared/models/Player.js";
import { Ball } from "@app/shared/models/Ball.js";
import { CloneBall } from "@app/shared/models/CloneBall.js";
import { PolygonData, PowerUpFruit } from "@app/shared/types.js";
import { paddleOffset, FRUIT_FREQUENCY, defaultLifeCount } from "@app/shared/consts.js";
import { CloneBallManager } from "./cloneBalls.js";
import { FruitManager } from "./fruits.js";
import { CollisionManager, CollisionDetector, PolygonCollisionManager } from "./collisions.js";
import { ScoringManager } from "./scoring.js";
import { GeometryManager } from "./geometry.js";

export type PlayerInput = {
	up: boolean
	down: boolean
	slot1?: boolean
	slot2?: boolean
	slot3?: boolean
}

/**
 * @brief Game logic service handling gameplay mechanics
 * 
 * Supports both classic 2-player mode (rectangle) and Battle Royale mode
 * (3-16 players with polygon arena).
 */
export class GameService
{
	public players: Player[];
	public ball!: Ball;
	public balls: Ball[];
	public cloneBalls: CloneBall[];
	public fruits: PowerUpFruit[];
	public fruitSpawnTimer: number;
	public ballTouched: boolean;
	public lastTouchedPlayerIndex: number;
	public readonly fruitSpawnInterval: number;
	public readonly maxFruits: number;
	public readonly lifeCount: number;
	public readonly canvasWidth: number;
	public readonly canvasHeight: number;
	public readonly isCustomMode: boolean;
	public readonly playerCount: number;
	private geometry: GeometryManager | null;
	private polygonData: PolygonData | null;
	private activePlayerCount: number;
	private _switchedToClassic: boolean;

	/**
	 * @brief Constructor
	 * @param canvasWidth Width of the game canvas
	 * @param canvasHeight Height of the game canvas
	 * @param isCustomMode Enable custom mode with power-ups
	 * @param fruitFrequency Frequency of fruit spawning
	 * @param lifeCount Number of lives per player
	 * @param playerCount Number of players (2-6)
	 * @param playerNames Array of player names
	 */
	constructor(
		canvasWidth: number,
		canvasHeight: number,
		isCustomMode: boolean = false,
		fruitFrequency: 'low' | 'normal' | 'high' = 'normal',
		lifeCount: number = defaultLifeCount,
		playerCount: number = 2,
		playerNames: string[] = []
	)
	{
		this.canvasWidth = canvasWidth;
		this.canvasHeight = canvasHeight;
		this.isCustomMode = isCustomMode;
		this.playerCount = playerCount;
		this.activePlayerCount = playerCount;
		this.players = [];
		this.balls = [];
		this.cloneBalls = [];
		this.fruits = [];
		this.fruitSpawnTimer = 0;
		this.ballTouched = false;
		this.lastTouchedPlayerIndex = -1;
		this.fruitSpawnInterval = FRUIT_FREQUENCY[fruitFrequency];
		this.maxFruits = fruitFrequency === 'low' ? 2 : fruitFrequency === 'normal' ? 4 : 7;
		this.lifeCount = lifeCount;
		this.geometry = null;
		this.polygonData = null;
		this._switchedToClassic = false;
		if (playerCount > 2)
		{
			const centerX = canvasWidth / 2;
			const centerY = canvasHeight / 2;
			const radius = Math.min(canvasWidth, canvasHeight) * 0.38;
			this.geometry = new GeometryManager(centerX, centerY, radius);
			this.polygonData = this.geometry.getPolygonData(playerCount);
		}
		this.initGame(playerCount, lifeCount, playerNames);
	}

	/**
	 * @brief Check if game is in polygon (Battle Royale) mode
	 * @returns True if polygon mode is active
	 */
	public isPolygonMode(): boolean
	{
		return this.geometry !== null && this.polygonData !== null;
	}

	/**
	 * @brief Check if game switched from polygon to classic mode
	 * @returns True if switched to classic, resets flag after read
	 */
	public hasSwitchedToClassic(): boolean
	{
		if (this._switchedToClassic)
		{
			this._switchedToClassic = false;
			return true;
		}
		return false;
	}

	/**
	 * @brief Get polygon data for rendering (null if classic mode)
	 * @returns Polygon data or null
	 */
	public getPolygonData(): PolygonData | null
	{
		return this.polygonData;
	}

	/**
	 * @brief Get active (non-eliminated) player count
	 * @returns Number of active players
	 */
	public getActivePlayerCount(): number
	{
		return this.players.filter(p => !p.isEliminated()).length;
	}

	/**
	 * @brief Initialize game objects with default positions
	 * @param playerCount Number of players
	 * @param lifeCount Number of lives per player
	 * @param playerNames Array of player names
	 */
	private initGame(playerCount: number, lifeCount: number, playerNames: string[]): void
	{
		this.players = [];
		this.balls = [];
		if (playerCount === 2)
		{
			this.players.push(
				new Player(playerNames[0] ?? 'Player 1', paddleOffset, lifeCount)
			);
			this.players.push(
				new Player(
					playerNames[1] ?? 'Player 2',
					this.canvasWidth - paddleOffset - 10,
					lifeCount
				)
			);
			this.ball = new Ball(this.canvasWidth / 2, this.canvasHeight / 2);
			return;
		}
		if (!this.polygonData)
			return;

		const center = this.polygonData.center;
		for (let i = 0; i < playerCount; i++)
		{
			const name = playerNames[i] ?? `Player ${i + 1}`;
			const sideData = this.polygonData.sides[i]!;
			const player = new Player(name, sideData.center.x, lifeCount);
			player.paddle.setPolygonCenter(center);
			player.paddle.configureSide(sideData.start, sideData.end, sideData.angle, this.polygonData.cornerRadius, playerCount);
			this.players.push(player);
		}
		this.ball = new Ball(center.x, center.y, undefined, true);
		this.balls.push(this.ball);
		this.updateBallCount();
	}

	/**
	 * @brief Calculate required ball count based on active players
	 * @returns Number of balls needed (ceil(playerCount / 3))
	 */
	private getRequiredBallCount(): number
	{
		return Math.ceil(this.activePlayerCount / 3);
	}

	/**
	 * @brief Update ball count to match current player count
	 */
	private updateBallCount(): void
	{
		if (!this.polygonData)
			return;

		const required = this.getRequiredBallCount();
		const center = this.polygonData.center;

		while (this.balls.length < required)
		{
			const newBall = new Ball(center.x, center.y, undefined, true);
			this.balls.push(newBall);
			console.log(`[BR] Added ball, total: ${this.balls.length}`);
		}
		while (this.balls.length > required)
		{
			this.balls.pop();
			console.log(`[BR] Removed ball, total: ${this.balls.length}`);
		}
		if (this.balls.length > 0)
			this.ball = this.balls[0]!;
	}

	/**
	 * @brief Get current game state
	 * @returns Object containing players, ball, balls, clones, fruits, and polygon data
	 */
	public getGameState(): {
		players: Player[];
		ball: Ball;
		balls: Ball[];
		cloneBalls: CloneBall[];
		fruits: PowerUpFruit[];
		polygonData: PolygonData | null;
	}
	{
		return {
			players: this.players,
			ball: this.ball,
			balls: this.balls,
			cloneBalls: this.cloneBalls,
			fruits: this.fruits,
			polygonData: this.polygonData
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
	 * @brief Get number of players
	 * @returns Number of players
	 */
	public getPlayerCount(): number
	{
		return this.players.length;
	}

	/**
	 * @brief Get active player at a specific side index
	 * @param sideIndex Side index in current polygon
	 * @returns Player at that side or undefined
	 */
	private getActivePlayerAtSide(sideIndex: number): Player | undefined
	{
		let currentSide = 0;

		for (const player of this.players)
		{
			if (player.isEliminated())
				continue;
			if (currentSide === sideIndex)
				return player;
			currentSide++;
		}
		return undefined;
	}

	/**
	 * @brief Get active side index for a player
	 * @param playerIndex Player index in players array
	 * @returns Side index in current polygon
	 */
	private getActiveSideIndex(playerIndex: number): number
	{
		let sideIndex = 0;

		for (let i = 0; i < playerIndex; i++)
		{
			const player = this.players[i];
			if (player && !player.isEliminated())
				sideIndex++;
		}
		return sideIndex;
	}

	/**
	 * @brief Force eliminate a player (for disconnection)
	 * @param playerIndex Index of player to eliminate
	 * @returns True if game should end (1 or fewer players remaining)
	 */
	public eliminatePlayer(playerIndex: number): boolean
	{
		const player = this.players[playerIndex];
		if (!player || player.isEliminated())
			return this.getActivePlayerCount() <= 1;
		player.lives = 0;
		console.log(`[BR] ${player.name} force eliminated (disconnection)`);
		this.handleElimination(playerIndex);
		return this.getActivePlayerCount() <= 1;
	}

	/**
	 * @brief Handle player elimination and arena resize
	 * @param playerIndex Index of eliminated player
	 */
	private handleElimination(playerIndex: number): void
	{
		if (!this.geometry)
			return;
		const activeCount = this.getActivePlayerCount();
		this.activePlayerCount = activeCount;

		if (activeCount === 2)
		{
			this.switchToClassicMode();
			return;
		}

		if (activeCount < 2)
			return;

		this.polygonData = this.geometry.getPolygonData(activeCount);

		let sideIndex = 0;
		for (const player of this.players)
		{
			if (player.isEliminated())
				continue;

			const sideData = this.polygonData.sides[sideIndex]!;
			player.paddle.setPolygonCenter(this.polygonData.center);
			player.paddle.configureSide(
				sideData.start,
				sideData.end,
				sideData.angle,
				this.polygonData.cornerRadius,
				activeCount
			);
			console.log(`[BR] Player ${player.name} paddle reconfigured: pos(${player.paddle.positionX.toFixed(1)}, ${player.paddle.positionY.toFixed(1)}), angle=${player.paddle.angle.toFixed(2)}, isPolygon=${player.paddle.isPolygonMode()}`);
			sideIndex++;
		}

		FruitManager.relocateFruits(this.fruits, this.polygonData);
		this.updateBallCount();
		for (const ball of this.balls)
			ball.resetToPoint(this.polygonData.center.x, this.polygonData.center.y, true);
	}

	/**
	 * @brief Switch from polygon to classic 2-player mode
	 */
	private switchToClassicMode(): void
	{
		console.log('[BR] Switching to classic 2-player mode');
		this.geometry = null;
		this.polygonData = null;
		this._switchedToClassic = true;
		this.balls = [];
		this.activePlayerCount = 2;

		const activePlayers = this.players.filter(p => !p.isEliminated());
		if (activePlayers.length !== 2)
			return;

		const player1 = activePlayers[0]!;
		const player2 = activePlayers[1]!;

		player1.paddle.resetToClassicMode();
		player1.paddle.positionX = 20;
		player1.paddle.positionY = this.canvasHeight / 2 - player1.paddle.height / 2;

		player2.paddle.resetToClassicMode();
		player2.paddle.positionX = this.canvasWidth - 20 - player2.paddle.width;
		player2.paddle.positionY = this.canvasHeight / 2 - player2.paddle.height / 2;

		this.ball.reset(this.canvasWidth, this.canvasHeight);
	}

	/**
	 * @brief Update polygon mode collisions
	 * @param deltaTime Time step for swept collision
	 * @returns True if game should end
	 */
	private updatePolygonCollisions(deltaTime: number): boolean
	{
		if (!this.geometry || !this.polygonData)
			return false;

		this.checkBallCollisions();

		const isMultiBall = this.balls.length > 1;

		for (const ball of this.balls)
		{
			for (let i = 0; i < this.players.length; i++)
			{
				const player = this.players[i];
				if (!player || player.isEliminated())
					continue;

				const activeSideIndex = this.getActiveSideIndex(i);
				const hit = PolygonCollisionManager.handlePaddleCollision(
					player,
					ball,
					this.geometry,
					activeSideIndex,
					this.activePlayerCount,
					this.cloneBalls,
					i,
					deltaTime,
					this.isCustomMode,
					this.players,
					isMultiBall
				);
				if (hit)
				{
					this.ballTouched = true;
					ball.lastTouchedPlayerIndex = i;
				}
			}

			const sideHit = PolygonCollisionManager.checkBoundary(
				ball,
				this.geometry,
				this.activePlayerCount,
				this.polygonData.center
			);
			if (sideHit >= 0)
			{
				const player = this.getActivePlayerAtSide(sideHit);
				if (player)
				{
					const scorer = ball.lastTouchedPlayerIndex >= 0
						? this.players[ball.lastTouchedPlayerIndex]
						: null;

					const eliminated = ScoringManager.handlePolygonScore(
						player,
						ball,
						this.polygonData.center,
						scorer,
						this.isCustomMode,
						this.players
					);
					ball.lastTouchedPlayerIndex = -1;
					if (eliminated)
					{
						console.log(`[BR] ${player.name} eliminated!`);
						this.handleElimination(this.players.indexOf(player));
					}

					const activeCount = this.getActivePlayerCount();
					if (activeCount <= 1)
					{
						const winner = this.players.find(p => !p.isEliminated());
						console.log(`[BR] Game Over! Winner: ${winner?.name ?? 'None'}`);
						return true;
					}
				}
			}
		}
		return false;
	}

	/**
	 * @brief Check and handle collisions between balls
	 */
	private checkBallCollisions(): void
	{
		for (let i = 0; i < this.balls.length; i++)
		{
			for (let j = i + 1; j < this.balls.length; j++)
			{
				const ball1 = this.balls[i]!;
				const ball2 = this.balls[j]!;
				const dx = ball2.positionX - ball1.positionX;
				const dy = ball2.positionY - ball1.positionY;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const minDist = ball1.size;

				if (dist < minDist && dist > 0)
				{
					const nx = dx / dist;
					const ny = dy / dist;
					const dvx = ball1.velocityX - ball2.velocityX;
					const dvy = ball1.velocityY - ball2.velocityY;
					const dvn = dvx * nx + dvy * ny;

					if (dvn > 0)
					{
						ball1.velocityX -= dvn * nx;
						ball1.velocityY -= dvn * ny;
						ball2.velocityX += dvn * nx;
						ball2.velocityY += dvn * ny;
					}

					const overlap = minDist - dist;
					ball1.positionX -= (overlap / 2) * nx;
					ball1.positionY -= (overlap / 2) * ny;
					ball2.positionX += (overlap / 2) * nx;
					ball2.positionY += (overlap / 2) * ny;
				}
			}
		}
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
			if (!player || player.isEliminated())
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
		if (this.balls.length > 0)
		{
			for (const ball of this.balls)
				ball.update(deltaTime);
		}
		else
			this.ball.update(deltaTime);
		CloneBallManager.update(this.cloneBalls, deltaTime, this.canvasHeight);
		if (this.isCustomMode)
		{
			this.fruitSpawnTimer += deltaTime;
			if (this.fruitSpawnTimer >= this.fruitSpawnInterval)
			{
				if (this.fruits.length < this.maxFruits)
					FruitManager.spawn(this.fruits, this.canvasWidth, this.canvasHeight, this.polygonData);
				this.fruitSpawnTimer = 0;
			}
			for (const ball of this.balls.length > 0 ? this.balls : [this.ball])
			{
				FruitManager.checkCollisions(
					this.fruits,
					ball,
					this.players,
					this.ballTouched,
					ball.lastTouchedPlayerIndex
				);
			}
		}
		if (this.isPolygonMode())
			return this.updatePolygonCollisions(deltaTime);

		if (this.playerCount > 2)
			return this.updateBattleRoyaleClassicCollisions();

		const [gameOver, lastTouch] = CollisionManager.checkAll(
			this.players,
			this.ball,
			this.cloneBalls,
			this.canvasWidth,
			this.canvasHeight,
			this.isCustomMode
		);

		if (lastTouch >= 0)
		{
			this.ballTouched = true;
			this.lastTouchedPlayerIndex = lastTouch;
		}
		return gameOver;
	}

	/**
	 * @brief Update collisions for Battle Royale game that switched to classic mode
	 * @returns True if game should end
	 */
	private updateBattleRoyaleClassicCollisions(): boolean
	{
		const activePlayers = this.players.filter(p => !p.isEliminated());
		if (activePlayers.length !== 2)
			return false;

		CollisionDetector.checkYCollisions(this.ball, this.canvasHeight);

		const [p1, p2] = activePlayers;
		const p1Index = this.players.indexOf(p1!);
		const p2Index = this.players.indexOf(p2!);

		let lastTouchedPlayerIndex = -1;
		const p1Touch = CollisionManager.checkPaddleTouch(
			this.players, p1Index, this.ball, this.cloneBalls,
			this.ball.velocityX < 0, this.isCustomMode
		);
		const p2Touch = CollisionManager.checkPaddleTouch(
			this.players, p2Index, this.ball, this.cloneBalls,
			this.ball.velocityX > 0, this.isCustomMode
		);
		if (p1Touch >= 0)
			lastTouchedPlayerIndex = p1Touch;
		if (p2Touch >= 0)
			lastTouchedPlayerIndex = p2Touch;

		if (lastTouchedPlayerIndex >= 0)
		{
			this.ballTouched = true;
			this.lastTouchedPlayerIndex = lastTouchedPlayerIndex;
		}

		if (this.ball.positionX < 0)
		{
			const loser = p1!;
			loser.loseLife();
			console.log(`[BR-Classic] ${loser.name} lost a life! ${loser.lives} remaining`);
			this.ball.reset(this.canvasWidth, this.canvasHeight);
			if (loser.isEliminated())
			{
				console.log(`[BR-Classic] Game Over! Winner: ${p2!.name}`);
				return true;
			}
		}
		else if (this.ball.positionX > this.canvasWidth)
		{
			const loser = p2!;
			loser.loseLife();
			console.log(`[BR-Classic] ${loser.name} lost a life! ${loser.lives} remaining`);
			this.ball.reset(this.canvasWidth, this.canvasHeight);
			if (loser.isEliminated())
			{
				console.log(`[BR-Classic] Game Over! Winner: ${p1!.name}`);
				return true;
			}
		}
		return false;
	}
}
