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
     * @param player Player who scored
     * @param opponent Opponent player (who got scored on)
     * @param ball Ball object
     * @param canvasWidth Width of the game canvas
     * @param canvasHeight Height of the game canvas
     * @param isCustomMode Whether custom mode is enabled
     * @param maxScore Maximum score to win the game
     * @returns True if game should end (max score reached)
     */
    public static handleScore(
        player: Player,
        opponent: Player,
        ball: Ball,
        canvasWidth: number,
        canvasHeight: number,
        isCustomMode: boolean,
        maxScore: number
    ): boolean
    {
        const oldScore = player.score;

        player.incrementScore();
        console.log(`[SERVER] POINT MARQUE! ${player.name}: ${oldScore} -> ${player.score}`);
        console.log(`[SERVER] Score actuel: ${player.name} ${player.score} - ${opponent.score} ${opponent.name}`);
        if (isCustomMode)
        {
            player.clearPendingPowerUps();
            opponent.clearPendingPowerUps();
            
            if (player.chargingPowerUp)
            {
                player.incrementHitStreak();
                console.log(`[SERVER] ${player.name} gained 1 charge for scoring (${player.hitStreak}/3)`);
                
                if (player.hitStreak >= 3)
                {
                    const powerUp = player.chargingPowerUp;
                    const slotIndex = powerUp === 'Son' ? 0 : powerUp === 'Pi' ? 1 : 2;
                    player.itemSlots[slotIndex] = powerUp;
                    player.chargingPowerUp = null;
                    player.hitStreak = 0;
                    console.log(`[SERVER] ${player.name} completed ${powerUp} from scoring bonus!`);
                }
            }
            
            opponent.resetHitStreak();
            const removedPowerUp = opponent.removeRandomPowerUp();
            if (removedPowerUp)
                console.log(`[SERVER] ${opponent.name} lost ${removedPowerUp} (got scored on)`);
            else
                console.log(`[SERVER] ${opponent.name} had no power-ups to lose`);
            console.log(`[SERVER] Pending power-ups cleared for both players`);
        }
        ball.reset(canvasWidth, canvasHeight);
        player.paddle.positionY = canvasHeight / 2 - paddleSize / 2;
        opponent.paddle.positionY = canvasHeight / 2 - paddleSize / 2;

        if (player.score >= maxScore) {
            console.log(`[SERVER] GAME OVER! ${player.name} wins ${player.score} - ${opponent.score}`);
            return true;
        }
        return false;
    }

    /**
     * @brief Check if player scored based on ball position
     * @param player Player to check score for
     * @param ball Ball object
     * @param condition Scoring condition
     * @returns True if player scored
     */
    public static checkScoreCondition(ball: Ball, condition: boolean): boolean
    {
        return condition;
    }
}
