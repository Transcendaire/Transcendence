import { Player, PowerUp } from "@app/shared/models/Player.js";
import { Ball } from "@app/shared/models/Ball.js";
import type { GameService } from "./game.js";

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
     * @param gameService Game service (for 16 effect clone creation)
     */
    public static activatePowerUp(player: Player, powerUp: PowerUp, ball: Ball, gameService: GameService): void
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
                ball.applySpeedBoost(1.5);
                console.log(`[PowerUpManager] Son effect: speed boost x1.8`);
                break;

            case '16':  
                gameService.createCloneBalls(15);
                console.log(`[PowerUpManager] 16 effect: 15 clone balls created`);
                break;
        }
    }

    /**
     * @brief Apply pending power-ups for a player
     * @param player Player whose pending power-ups should be applied
     * @param ball Game ball (for effects that modify ball behavior)
     * @param gameService Game service (for 16 effect clone creation)
     */
    public static applyPendingPowerUps(player: Player, ball: Ball, gameService: GameService): void
    {
        const pendingPowerUps = player.consumePendingPowerUps();
        
        if (pendingPowerUps.length > 0)
        {
            console.log(`[SERVER] ${player.name} applying pending power-ups: ${pendingPowerUps.join(', ')}`);
            pendingPowerUps.forEach((powerUp: PowerUp) => {
                PowerUpManager.activatePowerUp(player, powerUp, ball, gameService);
            });
        }
    }

    /**
     * @brief Award fruit bonus to player
     * @param player Player who collected the fruit
     * @details Completes charging power-up and starts another random one at same progress
     */
    public static awardFruitBonus(player: Player): void
    {
        if (!player.chargingPowerUp)
        {
            console.log(`[SERVER] ${player.name} collected fruit but has no charging power-up`);
            return;
        }

        const currentProgress = player.hitStreak;
        const completedPowerUp = player.chargingPowerUp;
        const slotIndex = completedPowerUp === 'Son' ? 0 : completedPowerUp === 'Pi' ? 1 : 2;

        player.itemSlots[slotIndex] = completedPowerUp;
        player.hitStreak = currentProgress;
        const newPowerUp = player.selectRandomChargingPowerUp();

        console.log(`[SERVER] ${player.name} fruit bonus: completed ${completedPowerUp}, started ${newPowerUp} at ${currentProgress}/3`);
    }
}
