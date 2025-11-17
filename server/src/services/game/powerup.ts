import { Player, PowerUp } from "@app/shared/models/Player.js";
import { Ball } from "@app/shared/models/Ball.js";

/**
 * @brief Power-up management utilities
 */
export class PowerUpManager
{
    /**
     * @brief Award charged power-up to player
     * @param player Player to award power-up to
     * @details Awards the power-up that was charging (chargingPowerUp)
     */
    public static awardRandomPowerUp(player: Player): void
    {
        const powerUp = player.chargingPowerUp;

        if (!powerUp)
        {
            console.log(`[SERVER] ${player.name} has no power-up charging`);
            return;
        }

        const slotIndex = powerUp === 'Son' ? 0 : powerUp === 'Pi' ? 1 : 2;

        if (player.itemSlots[slotIndex] !== null)
        {
            console.log(`[SERVER] ${player.name} already has ${powerUp}`);
            return;
        }

        player.itemSlots[slotIndex] = powerUp;
        player.chargingPowerUp = null;
        console.log(`[SERVER] ${player.name} awarded ${powerUp} (slot ${slotIndex + 1})`);
    }

    /**
     * @brief Activate power-up effect
     * @param player Player using the power-up
     * @param powerUp Power-up to activate
     * @param ball Game ball (for effects that modify ball behavior)
     */
    public static activatePowerUp(player: Player, powerUp: PowerUp, ball: Ball): void
    {
        if (!powerUp)
            return;

        console.log(`[PowerUpManager] ${player.name} activated ${powerUp}`);

        switch (powerUp)
        {
            case 'Pi':
                const curveDirection = Math.random() > 0.5 ? 1 : -1;
                ball.applyCurve(curveDirection);
                console.log(`[PowerUpManager] Pi effect: curve direction ${curveDirection}`);
                break;

            case 'Son':
                ball.applySpeedBoost(1.4);
                console.log(`[PowerUpManager] Son effect: speed boost x1.4`);
                break;

            case '16':
                console.log(`[PowerUpManager] 16 effect: TODO`);
                break;
        }
    }

    /**
     * @brief Apply pending power-ups for a player
     * @param player Player whose pending power-ups should be applied
     * @param ball Game ball (for effects that modify ball behavior)
     */
    public static applyPendingPowerUps(player: Player, ball: Ball): void
    {
        const pendingPowerUps = player.consumePendingPowerUps();
        
        if (pendingPowerUps.length > 0) {
            console.log(`[SERVER] ${player.name} applying pending power-ups: ${pendingPowerUps.join(', ')}`);
            pendingPowerUps.forEach((powerUp: PowerUp) => {
                PowerUpManager.activatePowerUp(player, powerUp, ball);
            });
        }
    }
}
