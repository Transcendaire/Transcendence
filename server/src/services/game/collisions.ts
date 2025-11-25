import { Player } from '@app/shared/models/Player.js';
import { Ball } from '@app/shared/models/Ball.js';
import { Paddle } from "@app/shared/models/Paddle.js";
import { CloneBall } from '@app/shared/models/CloneBall.js';
import { ScoringManager } from './scoring.js';
import { CloneBallManager } from './cloneBalls.js';
import { PowerUpManager } from './powerUps.js';

/**
 * @brief Collision detection utilities
 */
export class CollisionDetector
{
    /**
     * @brief Check if ball is colliding with paddle
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
	 * @param scorerIndex Index of player who scores
	 * @param ball Game ball
	 * @param cloneBalls Array of clone balls to clear
	 * @param cond Condition for scoring
	 * @param canvasWidth Width of canvas
	 * @param canvasHeight Height of canvas
	 * @param isCustomMode Whether custom mode is enabled
	 * @param maxScore Maximum score to win
	 * @returns True if game should end
	 */
	private static checkSide(
		players: Player[],
		scorerIndex: number,
		ball: Ball,
		cloneBalls: CloneBall[],
		cond: boolean,
		canvasWidth: number,
		canvasHeight: number,
		isCustomMode: boolean,
		maxScore: number
	): boolean
	{
		const scorer = players[scorerIndex];
		const loserIndex = scorerIndex === 0 ? 1 : 0;
		const loser = players[loserIndex];
		if (!scorer || !loser)
			return false;
		if (ScoringManager.checkScoreCondition(ball, cond))
		{
			if (cloneBalls.length > 0)
				CloneBallManager.clear(cloneBalls);
			return ScoringManager.handleScore(scorer, loser, ball, canvasWidth, canvasHeight, isCustomMode, maxScore);
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
	 * @param maxScore Maximum score to win
	 * @returns Tuple of [gameOver, lastTouchedPlayerIndex]
	 */
	public static checkAll(
		players: Player[],
		ball: Ball,
		cloneBalls: CloneBall[],
		canvasWidth: number,
		canvasHeight: number,
		isCustomMode: boolean,
		maxScore: number
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
		let gameOver = CollisionManager.checkSide(players, 1, ball, cloneBalls, ball.positionX < 0, canvasWidth, canvasHeight, isCustomMode, maxScore);
		if (!gameOver)
			gameOver = CollisionManager.checkSide(players, 0, ball, cloneBalls, ball.positionX > canvasWidth, canvasWidth, canvasHeight, isCustomMode, maxScore);
		return [gameOver, lastTouchedPlayerIndex];
	}
}