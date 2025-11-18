import { curveAcceleration } from "../consts.js";

/**
 * @brief Clone ball for 16 power-up effect
 * @details Fake ball that bounces on walls only, not on paddles
 */
export class CloneBall
{
    public positionX: number;
    public positionY: number;
    public velocityX: number;
    public velocityY: number;
    public readonly size: number;
    public isCurving: boolean;
    public curveDirection: number;

    /**
     * @brief Constructor
     * @param positionX Initial X position
     * @param positionY Initial Y position
     * @param velocityX Initial X velocity
     * @param velocityY Initial Y velocity
     */
    constructor(positionX: number, positionY: number, velocityX: number, velocityY: number)
    {
        this.positionX = positionX;
        this.positionY = positionY;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.size = 12;
        this.isCurving = false;
        this.curveDirection = 0;
    }

    /**
     * @brief Update clone position based on delta time
     * @param deltaTime Time elapsed since last update in milliseconds
     */
    public update(deltaTime: number): void
    {
        const dt = deltaTime / 1000;
        
        if (this.isCurving)
            this.velocityY += this.curveDirection * curveAcceleration * dt;

        this.positionX += this.velocityX * dt;
        this.positionY += this.velocityY * dt;
    }

    /**
     * @brief Apply curve effect to clone ball
     * @param direction Direction of curve (1 = down, -1 = up)
     */
    public applyCurve(direction: number): void
    {
        this.isCurving = true;
        this.curveDirection = direction;
    }

    /**
     * @brief Reverse vertical velocity for wall bouncing
     */
    public bounceVertical(): void
    {
        this.velocityY = -this.velocityY;
    }
}
