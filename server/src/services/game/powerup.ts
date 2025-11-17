import { Player, PowerUp } from "@app/shared/models/Player.js";

/**
 * @brief Power-up management utilities
 */
export class PowerUpManager
{
    /**
     * @brief Award random power-up to player
     * @param player Player to award power-up to
     * @details Respects slot constraints and existing power-ups
     */
    public static awardRandomPowerUp(player: Player): void
    {
        const availablePowerUps: PowerUp[] = [];

        if (!player.hasPowerUp('Son'))
            availablePowerUps.push('Son');
        if (!player.hasPowerUp('Pi'))
            availablePowerUps.push('Pi');
        if (!player.hasPowerUp('16'))
            availablePowerUps.push('16');
        
        console.log(`[SERVER] ${player.name} eligible for power-up. Available: ${availablePowerUps.join(', ')}`);
        
        if (availablePowerUps.length === 0) {
            console.log(`[SERVER] ${player.name} has all power-ups already`);
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * availablePowerUps.length);
        const powerUp = availablePowerUps[randomIndex];

        if (powerUp) {
            const success = player.addPowerUp(powerUp);
            console.log(`[SERVER] ${player.name} awarded power-up: ${powerUp} (success: ${success})`);
            console.log(`[SERVER] ${player.name} current slots: ${player.itemSlots.join(', ')}`);
        }
    }

    /**
     * @brief Activate power-up effect
     * @param player Player using the power-up
     * @param powerUp Power-up to activate
     */
    public static activatePowerUp(player: Player, powerUp: PowerUp): void
    {
        if (!powerUp)
            return;
        console.log(`[PowerUpManager] ${player.name} activated ${powerUp}`);
    }

    /**
     * @brief Apply pending power-ups for a player
     * @param player Player whose pending power-ups should be applied
     */
    public static applyPendingPowerUps(player: Player): void
    {
        const pendingPowerUps = player.consumePendingPowerUps();
        
        if (pendingPowerUps.length > 0) {
            console.log(`[SERVER] ${player.name} applying pending power-ups: ${pendingPowerUps.join(', ')}`);
            pendingPowerUps.forEach((powerUp: PowerUp) => {
                PowerUpManager.activatePowerUp(player, powerUp);
            });
        }
    }
}
