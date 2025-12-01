import { Player, PowerUp } from "@app/shared/models/Player.js";
import { Ball } from "@app/shared/models/Ball.js";
import { CloneBall } from "@app/shared/models/CloneBall.js";
import { CloneBallManager } from "./cloneBalls.js";

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
            return;
        const slotIndex = powerUp === 'Son' ? 0 : powerUp === 'Pi' ? 1 : 2;
        if (player.itemSlots[slotIndex] !== null)
            return;

        player.itemSlots[slotIndex] = powerUp;
        player.chargingPowerUp = null;
        console.log(`[SERVER] ${player.name} awarded ${powerUp} (slot ${slotIndex + 1})`);
    }

    /**
     * @brief Handle power-up logic when a player hits the ball
     * @param player Player who hit the ball
     * @param ball Game ball
     * @param cloneBalls Array of clone balls
     * @param allPlayers All players to clear pending power-ups from others
     */
    public static handlePaddleHit(
        player: Player,
        ball: Ball,
        cloneBalls: CloneBall[],
        allPlayers?: Player[]
    ): void
    {


        const pendingPowerUps = player.consumePendingPowerUps();
        if (pendingPowerUps.length > 0)
        {
            console.log(`[SERVER] ${player.name} applying pending power-ups: ${pendingPowerUps.join(', ')}`);
            for (const powerUp of pendingPowerUps)
                PowerUpManager.activatePowerUp(player, powerUp, ball, cloneBalls);
        }

        if (player.canGainCharge())
        {
            if (player.hitStreak === 0 && !player.chargingPowerUp)
            {
                const selected = player.selectRandomChargingPowerUp();
                if (selected)
                    player.incrementHitStreak();
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
    }

    /**
     * @brief Activate power-up effect
     * @param player Player using the power-up
     * @param powerUp Power-up to activate
     * @param ball Game ball (for effects that modify ball behavior)
     * @param cloneBalls Array of clone balls (for 16 effect clone creation)
     */
    public static activatePowerUp(player: Player, powerUp: PowerUp, ball: Ball, cloneBalls: CloneBall[]): void
    {
        if (!powerUp)
            return;

        console.log(`[PowerUpManager] ${player.name} activated ${powerUp}`);

        switch (powerUp)
        {
            case 'Pi':
                const curveDirection = Math.random() > 0.5 ? 1 : -1;
                ball.applyCurve(curveDirection);
                CloneBallManager.curve(cloneBalls, curveDirection);
                console.log(`[PowerUpManager] Pi effect: curve direction ${curveDirection}`);
                break;

            case 'Son':
                ball.applySpeedBoost(1.5);
                CloneBallManager.boost(cloneBalls, 1.5);
                console.log(`[PowerUpManager] Son effect: speed boost x1.5`);
                break;

            case '16':  
                CloneBallManager.create(cloneBalls, ball, 15);
                console.log(`[PowerUpManager] 16 effect: 15 clone balls created`);
                break;
        }
    }

    /**
     * @brief Apply pending power-ups for a player
     * @param player Player whose pending power-ups should be applied
     * @param ball Game ball (for effects that modify ball behavior)
     * @param cloneBalls Array of clone balls (for 16 effect clone creation)
     */
    public static applyPendingPowerUps(player: Player, ball: Ball, cloneBalls: CloneBall[]): void
    {
        const pendingPowerUps = player.consumePendingPowerUps();
        
        if (pendingPowerUps.length > 0)
        {
            console.log(`[SERVER] ${player.name} applying pending power-ups: ${pendingPowerUps.join(', ')}`);
            pendingPowerUps.forEach((powerUp: PowerUp) => {
                PowerUpManager.activatePowerUp(player, powerUp, ball, cloneBalls);
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
            if (player.selectRandomChargingPowerUp())
                player.hitStreak = 1;
            return;
        }

        const currentProgress = player.hitStreak;
        const completedPowerUp = player.chargingPowerUp;
        const slotIndex = completedPowerUp === 'Son' ? 0 : completedPowerUp === 'Pi' ? 1 : 2;
        player.itemSlots[slotIndex] = completedPowerUp;
        player.chargingPowerUp = null;
        player.hitStreak = 0;
        if (player.selectRandomChargingPowerUp())
            player.hitStreak = currentProgress;
    }
}
