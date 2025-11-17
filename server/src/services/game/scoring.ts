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
     * @param opponent Opponent player
     * @param ball Ball object
     * @param canvasWidth Width of the game canvas
     * @param canvasHeight Height of the game canvas
     * @param isCustomMode Whether custom mode is enabled
     */
    public static handleScore(
        player: Player,
        opponent: Player,
        ball: Ball,
        canvasWidth: number,
        canvasHeight: number,
        isCustomMode: boolean
    ): void
    {
        const oldScore = player.score;
        
        player.incrementScore();
        console.log(`[SERVER] POINT MARQUE! ${player.name}: ${oldScore} -> ${player.score}`);
        console.log(`[SERVER] Score actuel: ${player.name} ${player.score} - ${opponent.score} ${opponent.name}`);
        
        if (isCustomMode) {
            player.clearPendingPowerUps();
            opponent.clearPendingPowerUps();
            console.log(`[SERVER] Pending power-ups cleared for both players`);
        }
        
        ball.reset(canvasWidth, canvasHeight);
        player.paddle.positionY = canvasHeight / 2 - paddleSize / 2;
        opponent.paddle.positionY = canvasHeight / 2 - paddleSize / 2;
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
