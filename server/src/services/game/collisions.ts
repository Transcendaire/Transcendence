import { Player } from '@app/shared/models/Player.js';
import { Ball } from '@app/shared/models/Ball.js';
import { Paddle } from "@app/shared/models/Paddle.js";
import { CloneBall } from '@app/shared/models/CloneBall.js';
import { Point2D } from '@app/shared/types.js';
import { ScoringManager } from './scoring.js';
import { CloneBallManager } from './cloneBalls.js';
import { PowerUpManager } from './powerUps.js';
import { GeometryManager } from './geometry.js';

/**
 * @brief Collision detection utilities
 * 
 * Uses mathematically robust circle vs OBB (Oriented Bounding Box) collision detection.
 */
export class CollisionDetector
{
    /**
     * @brief Check if ball is colliding with paddle (classic AABB mode)
     * @param paddle Paddle to check collision with
     * @param ball Ball to check collision for
     * @returns True if collision detected
     */
    public static isTouchingPaddle(paddle: Paddle, ball: Ball): boolean
    {
        return (
            ball.positionX < paddle.positionX + paddle.width &&
            ball.positionX + ball.size > paddle.positionX &&
            ball.positionY < paddle.positionY + paddle.height &&
            ball.positionY + ball.size > paddle.positionY
        );
    }

    /**
     * @brief Check if paddle movement needs reverse effect on ball
     * @param paddle Paddle that hit the ball
     * @param ball Ball that was hit
     * @returns True if reverse effect needed
     */
    public static needsReverseEffect(paddle: Paddle, ball: Ball): boolean
    {
        return (paddle.dir && ball.velocityY > 0) || (!paddle.dir && ball.velocityY < 0);
    }

    /**
     * @brief Check ball collision with top and bottom walls
     * @param ball Ball to check collision for
     * @param canvasHeight Height of the game canvas
     */
    public static checkYCollisions(ball: Ball, canvasHeight: number): void
    {
        if (ball.positionY <= 0 && ball.velocityY < 0 
            || ball.positionY >= canvasHeight - ball.size && ball.velocityY > 0)
            ball.bounceVertical();
    }

    /**
     * @brief Check ball collision with paddle in polygon mode using continuous collision detection
     * @param player Player to check
     * @param ball Ball to check
     * @param deltaTime Time step for swept collision
     * @returns True if collision detected
     */
    public static isTouchingPolygonPaddle(player: Player, ball: Ball, deltaTime: number = 16): boolean
    {
        if (player.isEliminated())
            return false;
        const paddle = player.paddle;
        if (!paddle.isPolygonMode())
            return false;
        const paddleCenter = paddle.getCenter();
        const paddleAngle = paddle.angle;
        const halfLength = paddle.height / 2;
        const halfWidth = paddle.width / 2;
        const ballRadius = ball.size / 2;
        const ballSpeed = Math.sqrt(ball.velocityX ** 2 + ball.velocityY ** 2);
        const dt = deltaTime / 1000;
        const travelDist = ballSpeed * dt;
        const ballPosNow: Point2D = {
            x: ball.positionX + ballRadius,
            y: ball.positionY + ballRadius
        };
        const ballPosPrev: Point2D = {
            x: ballPosNow.x - ball.velocityX * dt,
            y: ballPosNow.y - ball.velocityY * dt
        };
        const checkPosition = (pos: Point2D): boolean => {
            const dx = pos.x - paddleCenter.x;
            const dy = pos.y - paddleCenter.y;
            const cos = Math.cos(-paddleAngle);
            const sin = Math.sin(-paddleAngle);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;
            const closestX = Math.max(-halfLength, Math.min(halfLength, localX));
            const closestY = Math.max(-halfWidth, Math.min(halfWidth, localY));
            const distX = localX - closestX;
            const distY = localY - closestY;
            const distSq = distX * distX + distY * distY;
            const threshold = (ballRadius + 2) * (ballRadius + 2);
            return distSq <= threshold;
        };
        const sampleCount = Math.max(20, Math.ceil(travelDist));
        for (let i = 0; i <= sampleCount; i++)
        {
            const t = i / sampleCount;
            const samplePos: Point2D = {
                x: ballPosPrev.x + (ballPosNow.x - ballPosPrev.x) * t,
                y: ballPosPrev.y + (ballPosNow.y - ballPosPrev.y) * t
            };
            if (checkPosition(samplePos))
                return true;
        }
        return false;
    }

    /**
     * @brief Get penetration depth and direction for collision resolution
     * @param player Player whose paddle to check
     * @param ball Ball to check
     * @returns Object with penetration depth and normal, or null if no collision
     */
    public static getCollisionInfo(player: Player, ball: Ball): { depth: number; normalX: number; normalY: number } | null
    {
        if (player.isEliminated())
            return null;

        const paddle = player.paddle;
        const paddleCenter = paddle.getCenter();
        const paddleAngle = paddle.angle;
        const halfLength = paddle.height / 2;
        const halfWidth = paddle.width / 2;
        const ballCenter: Point2D = {
            x: ball.positionX + ball.size / 2,
            y: ball.positionY + ball.size / 2
        };
        const ballRadius = ball.size / 2;
        const dx = ballCenter.x - paddleCenter.x;
        const dy = ballCenter.y - paddleCenter.y;
        const cos = Math.cos(-paddleAngle);
        const sin = Math.sin(-paddleAngle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        const closestX = Math.max(-halfLength, Math.min(halfLength, localX));
        const closestY = Math.max(-halfWidth, Math.min(halfWidth, localY));
        const distX = localX - closestX;
        const distY = localY - closestY;
        const distSquared = distX * distX + distY * distY;

        if (distSquared >= ballRadius * ballRadius)
            return null;

        const dist = Math.sqrt(distSquared);
        const depth = ballRadius - dist;
        let localNormalX: number;
        let localNormalY: number;

        if (dist > 0.001)
        {
            localNormalX = distX / dist;
            localNormalY = distY / dist;
        }
        else
        {
            localNormalX = 0;
            localNormalY = -1;
        }

        const cosPos = Math.cos(paddleAngle);
        const sinPos = Math.sin(paddleAngle);
        const normalX = localNormalX * cosPos - localNormalY * sinPos;
        const normalY = localNormalX * sinPos + localNormalY * cosPos;

        return { depth, normalX, normalY };
    }
}


/**
 * @brief Collision and scoring management utilities
 */
export class CollisionManager
{
	/**
	 * @brief Handle paddle collision with ball and apply power-ups
	 * @param players Array of players
	 * @param playerIndex Index of player to check
	 * @param ball Ball to check collision for
	 * @param cloneBalls Array of clone balls to clear on hit
	 * @param antiDoubleTap Prevent double collision detection
	 * @param isCustomMode Whether custom mode is enabled
	 * @returns Index of player who touched ball, or -1
	 */
	public static checkPaddleTouch(
		players: Player[],
		playerIndex: number,
		ball: Ball,
		cloneBalls: CloneBall[],
		antiDoubleTap: boolean,
		isCustomMode: boolean
	): number
	{
		const player = players[playerIndex];
		if (!player)
			return -1;
		if (antiDoubleTap && CollisionDetector.isTouchingPaddle(player.paddle, ball))
		{
			ball.bounce(player.paddle);
			if (ball.isCurving)
				ball.removeCurve();
			if (ball.isBoosted)
				ball.removeSpeedBoost();
			if (cloneBalls.length > 0)
				CloneBallManager.clear(cloneBalls);
			if (isCustomMode)
				CollisionManager.handlePowerUpOnHit(player, ball, cloneBalls);
			return playerIndex;
		}
		return -1;
	}

	/**
	 * @brief Handle power-up logic when ball hits paddle
	 * @param player Player who hit the ball
	 * @param ball Game ball
	 * @param cloneBalls Array of clone balls (for 16 effect)
	 */
	private static handlePowerUpOnHit(player: Player, ball: Ball, cloneBalls: CloneBall[]): void
	{
		const pendingPowerUps = player.consumePendingPowerUps();
		if (pendingPowerUps.length > 0)
		{
			console.log(`[SERVER] ${player.name} applying pending power-ups: ${pendingPowerUps.join(', ')}`);
			pendingPowerUps.forEach((powerUp) => {
				if (powerUp === 'Pi')
				{
					const curveDirection = Math.random() > 0.5 ? 1 : -1;
					ball.applyCurve(curveDirection);
					CloneBallManager.curve(cloneBalls, curveDirection);
					console.log(`[PowerUpManager] Pi effect: curve direction ${curveDirection}`);
				}
				else if (powerUp === 'Son')
				{
					ball.applySpeedBoost(1.5);
					CloneBallManager.boost(cloneBalls, 1.5);
					console.log(`[PowerUpManager] Son effect: speed boost x1.5`);
				}
				else if (powerUp === '16')
				{
					CloneBallManager.create(cloneBalls, ball, 15);
					console.log(`[PowerUpManager] 16 effect: 15 clone balls created`);
				}
			});
		}
		if (player.hitStreak === 0 && !player.chargingPowerUp)
		{
			const selected = player.selectRandomChargingPowerUp();
			if (selected)
			{
				player.incrementHitStreak();
				console.log(`[SERVER] ${player.name} started charging ${selected}`);
			}
		}
		else if (player.chargingPowerUp)
			player.incrementHitStreak();
		console.log(`[SERVER] ${player.name} hit streak: ${player.hitStreak}`);
		if (player.hitStreak >= 3 && player.chargingPowerUp)
		{
			PowerUpManager.awardRandomPowerUp(player);
			player.resetHitStreak();
		}
	}

	/**
	 * @brief Check scoring for a specific side
	 * @param players Array of players
	 * @param loserIndex Index of player who loses a life
	 * @param ball Game ball
	 * @param cloneBalls Array of clone balls to clear
	 * @param cond Condition for scoring
	 * @param canvasWidth Width of canvas
	 * @param canvasHeight Height of canvas
	 * @param isCustomMode Whether custom mode is enabled
	 * @returns True if game should end
	 */
	private static checkSide(
		players: Player[],
		loserIndex: number,
		ball: Ball,
		cloneBalls: CloneBall[],
		cond: boolean,
		canvasWidth: number,
		canvasHeight: number,
		isCustomMode: boolean
	): boolean
	{
		const loser = players[loserIndex];
		const winnerIndex = loserIndex === 0 ? 1 : 0;
		const winner = players[winnerIndex];
		if (!loser || !winner)
			return false;
		if (ScoringManager.checkScoreCondition(ball, cond))
		{
			if (cloneBalls.length > 0)
				CloneBallManager.clear(cloneBalls);
			return ScoringManager.handleScore(loser, winner, ball, canvasWidth, canvasHeight, isCustomMode);
		}
		return false;
	}

	/**
	 * @brief Check all collisions and scoring
	 * @param players Array of players
	 * @param ball Game ball
	 * @param cloneBalls Array of clone balls
	 * @param canvasWidth Width of canvas
	 * @param canvasHeight Height of canvas
	 * @param isCustomMode Whether custom mode is enabled
	 * @returns Tuple of [gameOver, lastTouchedPlayerIndex]
	 */
	public static checkAll(
		players: Player[],
		ball: Ball,
		cloneBalls: CloneBall[],
		canvasWidth: number,
		canvasHeight: number,
		isCustomMode: boolean
	): [boolean, number]
	{
		CollisionDetector.checkYCollisions(ball, canvasHeight);
		let lastTouchedPlayerIndex = -1;
		const p1Touch = CollisionManager.checkPaddleTouch(players, 0, ball, cloneBalls, ball.velocityX < 0, isCustomMode);
		const p2Touch = CollisionManager.checkPaddleTouch(players, 1, ball, cloneBalls, ball.velocityX > 0, isCustomMode);
		if (p1Touch >= 0)
			lastTouchedPlayerIndex = p1Touch;
		if (p2Touch >= 0)
			lastTouchedPlayerIndex = p2Touch;
		let gameOver = CollisionManager.checkSide(players, 0, ball, cloneBalls, ball.positionX < 0, canvasWidth, canvasHeight, isCustomMode);
		if (!gameOver)
			gameOver = CollisionManager.checkSide(players, 1, ball, cloneBalls, ball.positionX > canvasWidth, canvasWidth, canvasHeight, isCustomMode);
		return [gameOver, lastTouchedPlayerIndex];
	}
}


/**
 * @brief Collision manager for polygon Battle Royale mode
 */
export class PolygonCollisionManager
{
	private static readonly GOAL_THRESHOLD = 10;

	/**
	 * @brief Check ball collision with polygon boundary
	 * @param ball Game ball
	 * @param geometry Geometry manager
	 * @param activePlayerCount Number of active players
	 * @param center Polygon center point
	 * @returns Index of side hit (-1 if inside or corner bounce)
	 */
	public static checkBoundary(
		ball: Ball,
		geometry: GeometryManager,
		activePlayerCount: number,
		center: Point2D
	): number
	{
		const ballCenter: Point2D = {
			x: ball.positionX + ball.size / 2,
			y: ball.positionY + ball.size / 2
		};
		const ballRadius = ball.size / 2;

		const cornerIndex = geometry.checkCornerCollision(
			ballCenter,
			ballRadius,
			activePlayerCount
		);

		if (cornerIndex >= 0)
		{
			const velocity: Point2D = { x: ball.velocityX, y: ball.velocityY };
			const reflected = geometry.reflectOffCorner(
				velocity,
				activePlayerCount,
				cornerIndex,
				ballCenter
			);
			ball.velocityX = reflected.x;
			ball.velocityY = reflected.y;
			const vertex = geometry.getVertex(activePlayerCount, cornerIndex);
			ball.pushAwayFrom(vertex.x, vertex.y, 5);
			return -1;
		}

		if (geometry.isPointInside(ballCenter, activePlayerCount))
			return -1;

		const closestSide = geometry.getClosestSide(ballCenter, activePlayerCount);
		if (closestSide < 0)
			return -1;

		const distanceOutside = geometry.getDistanceOutside(
			ballCenter,
			activePlayerCount,
			closestSide
		);

		if (distanceOutside < this.GOAL_THRESHOLD)
			return -1;

		return closestSide;
	}

	/**
	 * @brief Handle paddle collision in polygon mode
	 * @param player Player to check
	 * @param ball Game ball
	 * @param geometry Geometry manager
	 * @param activeSideIndex Player's side index
	 * @param activePlayerCount Number of active players
	 * @param cloneBalls Clone balls to clear
	 * @param lastHitPlayerIndex Index of last player who hit the ball (-1 if none)
	 * @param playerIndex Current player index being checked
	 * @returns True if collision occurred
	 */
	public static handlePaddleCollision(
		player: Player,
		ball: Ball,
		geometry: GeometryManager,
		activeSideIndex: number,
		activePlayerCount: number,
		cloneBalls: CloneBall[],
		lastHitPlayerIndex: number = -1,
		playerIndex: number = -1,
		deltaTime: number = 16
	): boolean
	{
		if (!CollisionDetector.isTouchingPolygonPaddle(player, ball, deltaTime))
			return false;

		const paddleCenter = player.paddle.getCenter();
		const normal = geometry.getSideNormal(activePlayerCount, activeSideIndex);

		console.log(`[COLLISION] Paddle hit! Player: ${player.name}, Side: ${activeSideIndex}`);

		const paddleAngle = player.paddle.angle;
		ball.bouncePolygon(paddleCenter, paddleAngle, player.paddle.height, normal);

		if (cloneBalls.length > 0)
			CloneBallManager.clear(cloneBalls);
		return true;
	}
}