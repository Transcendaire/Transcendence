import { Paddle } from "./Paddle.js";
import { canvasHeight, paddleSize } from "../consts.js"

export type PowerUp = 'Son' | 'Pi' | '16' | null;

/**
 * @brief Player representation with lives and paddle
 */
export class Player
{
    public lives: number;
    public paddle: Paddle;
    public readonly name: string;
    public hitStreak: number;
    public itemSlots: PowerUp[];
    public pendingPowerUps: PowerUp[];
    public selectedSlots: boolean[];
    public chargingPowerUp: PowerUp;

    /**
     * @brief Constructor
     * @param name Player display name
     * @param paddleX X position for the player's paddle
     * @param initialLives Starting number of lives
     */
    constructor(name: string, paddleX: number, initialLives: number = 5)
    {
        this.name = name;
        this.lives = initialLives;
        this.hitStreak = 0;
        this.itemSlots = [null, null, null];
        this.pendingPowerUps = [];
        this.selectedSlots = [false, false, false];
        this.chargingPowerUp = null;
        this.paddle = new Paddle(paddleX, canvasHeight / 2 - paddleSize / 2);
    }

    /**
     * @brief Decrease player lives by one
     */
    public loseLife(): void
    {
        if (this.lives > 0)
            this.lives--;
    }

    /**
     * @brief Check if player is eliminated (0 lives)
     * @returns True if player has no lives left
     */
    public isEliminated(): boolean
    {
        return this.lives <= 0;
    }

    /**
     * @brief Increment hit streak counter
     */
    public incrementHitStreak(): void
    {
        this.hitStreak++;
    }

    /**
     * @brief Reset hit streak to zero and clear charging power-up
     */
    public resetHitStreak(): void
    {
        this.hitStreak = 0;
        this.chargingPowerUp = null;
    }

    /**
     * @brief Select random power-up to charge from empty slots
     * @returns Selected power-up or null if all slots full
     */
    public selectRandomChargingPowerUp(): PowerUp
    {
        const availablePowerUps: PowerUp[] = [];

        if (this.itemSlots[0] === null) availablePowerUps.push('Son');
        if (this.itemSlots[1] === null) availablePowerUps.push('Pi');
        if (this.itemSlots[2] === null) availablePowerUps.push('16');

        if (availablePowerUps.length === 0)
            return null;

        const randomIndex = Math.floor(Math.random() * availablePowerUps.length);
        const selected = availablePowerUps[randomIndex] ?? null;
        this.chargingPowerUp = selected;
        return selected;
    }

    /**
     * @brief Check if player has specific power-up
     * @param powerUp Power-up to check
     * @returns True if player has this power-up
     */
    public hasPowerUp(powerUp: PowerUp): boolean
    {
        return this.itemSlots.includes(powerUp);
    }

    /**
     * @brief Add power-up to first available slot
     * @param powerUp Power-up to add
     * @returns True if successfully added
     */
    public addPowerUp(powerUp: PowerUp): boolean
    {
        if (this.hasPowerUp(powerUp))
            return false;
        const emptyIndex = this.itemSlots.findIndex(slot => slot === null);

        if (emptyIndex === -1)
            return false;
        this.itemSlots[emptyIndex] = powerUp;
        return true;
    }

    /**
     * @brief Select power-up slot for activation (registers for next bounce)
     * @param slotIndex Slot index (0, 1, or 2)
     * @returns Power-up that was selected, or null if slot empty or cancelled
     */
    public activatePowerUp(slotIndex: number): PowerUp
    {
        if (slotIndex < 0 || slotIndex >= 3)
            return null;
        const powerUp = this.itemSlots[slotIndex] || null;

        if (powerUp && !this.selectedSlots[slotIndex])
        {
            this.selectedSlots[slotIndex] = true;
            if (!this.pendingPowerUps.includes(powerUp))
                this.pendingPowerUps.push(powerUp);
        }
        return powerUp;
    }

    /**
     * @brief Cancel a pending power-up activation
     * @param slotIndex Slot index (0, 1, or 2)
     * @returns True if power-up was cancelled
     */
    public cancelPowerUp(slotIndex: number): boolean
    {
        if (slotIndex < 0 || slotIndex >= 3)
            return false;
        if (!this.selectedSlots[slotIndex])
            return false;
        const powerUp = this.itemSlots[slotIndex];

        if (powerUp)
        {
            this.selectedSlots[slotIndex] = false;
            const pendingIndex = this.pendingPowerUps.indexOf(powerUp);

            if (pendingIndex !== -1)
                this.pendingPowerUps.splice(pendingIndex, 1);
            return true;
        }
        return false;
    }

    /**
     * @brief Apply and clear all pending power-ups
     * @returns Array of power-ups to apply
     */
    public consumePendingPowerUps(): PowerUp[]
    {
        const powerUps = [...this.pendingPowerUps];

        this.selectedSlots.forEach((selected, index) => {
            if (selected)
                this.itemSlots[index] = null;
        });
        this.pendingPowerUps = [];
        this.selectedSlots = [false, false, false];
        return powerUps;
    }

    /**
     * @brief Clear pending power-ups without applying them
     */
    public clearPendingPowerUps(): void
    {
        this.pendingPowerUps = [];
        this.selectedSlots = [false, false, false];
    }

    /**
     * @brief Remove random completed power-up from slots
     * @returns Name of removed power-up or null if no power-ups
     */
    public removeRandomPowerUp(): PowerUp
    {
        const filledSlots: number[] = [];

        for (let i = 0; i < 3; i++)
            if (this.itemSlots[i] !== null)
                filledSlots.push(i);

        if (filledSlots.length === 0)
            return null;

        const randomIndex = filledSlots[Math.floor(Math.random() * filledSlots.length)]!;
        const removedPowerUp = this.itemSlots[randomIndex]!;
        this.itemSlots[randomIndex] = null;

        return removedPowerUp;
    }
}
