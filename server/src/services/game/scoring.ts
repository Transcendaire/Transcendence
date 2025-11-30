import { Player } from "@app/shared/models/Player.js";
import { Ball } from "@app/shared/models/Ball.js";
import { Point2D } from "@app/shared/types.js";
import { paddleSize } from "@app/shared/consts.js";

/**
 * @brief Scoring management utilities
 */
export class ScoringManager
{
    /**
     * @brief Handle scoring and reset game state
     * @param loser Player who lost a life
     * @param winner Player who caused the point
     * @param ball Ball object
     * @param canvasWidth Width of the game canvas
     * @param canvasHeight Height of the game canvas
     * @param isCustomMode Whether custom mode is enabled
     * @returns True if game should end (loser has 0 lives)
     */
    public static handleScore(
        loser: Player,
        winner: Player,
        ball: Ball,
        canvasWidth: number,
        canvasHeight: number,
        isCustomMode: boolean
    ): boolean
    {
        const oldLives = loser.lives;

        loser.loseLife();
        console.log(`[SERVER] ${loser.name} LOST A LIFE! ${oldLives} -> ${loser.lives}`);
        console.log(`[SERVER] Lives: ${winner.name} ${winner.lives} - ${loser.lives} ${loser.name}`);
        if (isCustomMode)
        {
            winner.clearPendingPowerUps();
            loser.clearPendingPowerUps();
            
            if (winner.chargingPowerUp)
            {
                winner.incrementHitStreak();
                console.log(`[SERVER] ${winner.name} gained 1 charge for scoring (${winner.hitStreak}/3)`);
                
                if (winner.hitStreak >= 3)
                {
                    const powerUp = winner.chargingPowerUp;
                    const slotIndex = powerUp === 'Son' ? 0 : powerUp === 'Pi' ? 1 : 2;
                    winner.itemSlots[slotIndex] = powerUp;
                    winner.chargingPowerUp = null;
                    winner.hitStreak = 0;
                    console.log(`[SERVER] ${winner.name} completed ${powerUp} from scoring bonus!`);
                }
            }
            
            loser.resetHitStreak();
            const removedPowerUp = loser.removeRandomPowerUp();
            if (removedPowerUp)
                console.log(`[SERVER] ${loser.name} lost ${removedPowerUp} (lost a life)`);
            else
                console.log(`[SERVER] ${loser.name} had no power-ups to lose`);
            console.log(`[SERVER] Pending power-ups cleared for both players`);
        }
        ball.reset(canvasWidth, canvasHeight);
        winner.paddle.positionY = canvasHeight / 2 - paddleSize / 2;
        loser.paddle.positionY = canvasHeight / 2 - paddleSize / 2;

        if (loser.isEliminated())
        {
            console.log(`[SERVER] GAME OVER! ${winner.name} wins (${winner.lives} lives remaining)`);
            return true;
        }
        return false;
    }

    /**
     * @brief Handle polygon mode scoring (no winner, just loser loses life)
     * @param loser Player who lost a life
     * @param ball Ball object
     * @param center Polygon center for ball reset
     * @param scorer Player who scored (last to touch the ball), or null
     * @param isCustomMode Whether custom mode with power-ups is enabled
     * @param allPlayers All players to clear pending power-ups
     * @returns True if player is eliminated
     */
    public static handlePolygonScore(
        loser: Player,
        ball: Ball,
        center: Point2D,
        scorer: Player | null = null,
        isCustomMode: boolean = false,
        allPlayers?: Player[]
    ): boolean
    {
        loser.loseLife();
        const ballPos = { x: ball.positionX + ball.size/2, y: ball.positionY + ball.size/2 };
        const paddlePos = loser.paddle.getCenter();
        const dist = Math.sqrt((ballPos.x - paddlePos.x)**2 + (ballPos.y - paddlePos.y)**2);
        console.log(`[BR] ${loser.name} lost a life! ${loser.lives} remaining | ball(${ballPos.x.toFixed(0)},${ballPos.y.toFixed(0)}) paddle(${paddlePos.x.toFixed(0)},${paddlePos.y.toFixed(0)}) dist=${dist.toFixed(0)}`);

        if (isCustomMode)
        {
            if (allPlayers)
            {
                for (const p of allPlayers)
                    if (!p.isEliminated())
                        p.clearPendingPowerUps();
            }

            if (scorer && scorer !== loser)
            {
                scorer.awardFullCharge();
                console.log(`[BR] ${scorer.name} gained full charge for scoring!`);
            }

            loser.resetHitStreak();
            const removedPowerUp = loser.removeRandomPowerUp();
            if (removedPowerUp)
                console.log(`[BR] ${loser.name} lost ${removedPowerUp} (conceded a goal)`);
        }

        ball.resetToPoint(center.x, center.y, true);
        return loser.isEliminated();
    }

    /**
     * @brief Check if opponent should lose a life based on ball position
     * @param ball Ball object
     * @param condition Scoring condition
     * @returns True if scoring condition met
     */
    public static checkScoreCondition(ball: Ball, condition: boolean): boolean
    {
        return condition;
    }
}
