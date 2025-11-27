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
 * (3-6 players with polygon arena).
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
	public readonly lifeCount: number;
	public readonly canvasWidth: number;
	public readonly canvasHeight: number;
	public readonly isCustomMode: boolean;
	public readonly playerCount: number;
	private geometry: GeometryManager | null;
	private polygonData: PolygonData | null;
	private activePlayerCount: number;

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
		const defaultNames = [
			'Player 1', 'Player 2', 'Player 3',
			'Player 4', 'Player 5', 'Player 6'
		];

		this.players = [];
		if (playerCount === 2)
		{
			this.players.push(
				new Player(playerNames[0] ?? defaultNames[0]!, paddleOffset, lifeCount)
			);
			this.players.push(
				new Player(
					playerNames[1] ?? defaultNames[1]!,
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
			const name = playerNames[i] ?? defaultNames[i]!;
			const sideData = this.polygonData.sides[i]!;
			const player = new Player(name, sideData.center.x, lifeCount);
			player.paddle.setPolygonCenter(center);
			player.paddle.configureSide(sideData.start, sideData.end, sideData.angle, this.polygonData.cornerRadius, playerCount);
			this.players.push(player);
		}
		this.ball = new Ball(center.x, center.y, undefined, true);
	}

	/**
	 * @brief Get current game state
	 * @returns Object containing players, ball, clones, fruits, and polygon data
	 */
	public getGameState(): {
		players: Player[];
		ball: Ball;
		cloneBalls: CloneBall[];
		fruits: PowerUpFruit[];
		polygonData: PolygonData | null;
	}
	{
		return {
			players: this.players,
			ball: this.ball,
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
		if (this.polygonData)
			this.ball.resetToPoint(this.polygonData.center.x, this.polygonData.center.y, true);
	}

	/**
	 * @brief Switch from polygon to classic 2-player mode
	 */
	private switchToClassicMode(): void
	{
		console.log('[BR] Switching to classic 2-player mode');
		this.geometry = null;
		this.polygonData = null;

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

		for (let i = 0; i < this.players.length; i++)
		{
			const player = this.players[i];
			if (!player || player.isEliminated())
				continue;

			const activeSideIndex = this.getActiveSideIndex(i);
			const hit = PolygonCollisionManager.handlePaddleCollision(
				player,
				this.ball,
				this.geometry,
				activeSideIndex,
				this.activePlayerCount,
				this.cloneBalls,
				this.lastTouchedPlayerIndex,
				i,
				deltaTime
			);

			if (hit)
			{
				this.ballTouched = true;
				this.lastTouchedPlayerIndex = i;
			}
		}

		const sideHit = PolygonCollisionManager.checkBoundary(
			this.ball,
			this.geometry,
			this.activePlayerCount,
			this.polygonData.center
		);

		if (sideHit >= 0)
		{
			const player = this.getActivePlayerAtSide(sideHit);
			if (player)
			{
				const eliminated = ScoringManager.handlePolygonScore(
					player,
					this.ball,
					this.polygonData.center
				);

				this.lastTouchedPlayerIndex = -1;

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
		return false;
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
			FruitManager.checkCollisions(
				this.fruits,
				this.ball,
				this.players,
				this.ballTouched,
				this.lastTouchedPlayerIndex
			);
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
