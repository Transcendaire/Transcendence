import { Player } from "@app/shared/models/Player.js";
import { Ball } from "@app/shared/models/Ball.js";
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
