import { Paddle } from "./Paddle.js";
import { curveAcceleration } from "../consts.js";

export const velYfactor = 500;

/**
 * @brief Game ball physics and movement
 */
export class Ball
{
    public positionX: number;
    public positionY: number;
    public velocityX: number;
    public velocityY: number;
    public rotation: number;
    public readonly size: number;
    public readonly speedIncrement: number;
    public curveDirection: number;
    public isCurving: boolean;
    public isBoosted: boolean;
    public previousSpeed: number;

    /**
     * @brief Initialize ball direction and velocity
     * @param start True to randomize initial X direction
     */
    public ballStart(start: boolean)
    {
        const randomY = Math.random();
        
        this.velocityY = (randomY - 0.5) * velYfactor;
        if (start) {
            const randomX = Math.random();
            
            if (randomX > 0.5)
                this.velocityX = -this.velocityX;
        }
    }

    /**
     * @brief Constructor
     * @param positionX Initial X position
     * @param positionY Initial Y position
     * @param velocityX Initial X velocity
     */
    constructor(positionX: number, positionY: number, velocityX: number = 200)
    {
        this.positionX = positionX;
        this.positionY = positionY;
        this.velocityX = velocityX;
        this.velocityY = 0;
        this.rotation = 0;
        this.size = 12;
        this.speedIncrement = 1.1;
        this.curveDirection = 0;
        this.isCurving = false;
        this.isBoosted = false;
        this.previousSpeed = 0;
        
        this.ballStart(true);
    }

    /**
     * @brief Update ball position and rotation based on delta time
     * @param deltaTime Time elapsed since last update in milliseconds
     */
    public update(deltaTime: number): void
    {
        const dt = deltaTime / 1000;
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        
        if (this.isCurving)
            this.velocityY += this.curveDirection * curveAcceleration * dt;

        this.positionX += this.velocityX * dt;
        this.positionY += this.velocityY * dt;
        this.rotation += speed * dt * 0.01;
    }

    /**
     * @brief Reverse vertical velocity for wall bouncing
     */
    public bounceVertical(): void
    {
        this.velocityY = -this.velocityY;
    }

    /**
     * @brief Reverse horizontal velocity and apply speed increment
     */
    public bounceHorizontal(): void
    {
        this.velocityX = -this.velocityX * this.speedIncrement;
    }

    /**
     * @brief Bounce on paddle with angle based on hit position
     * @param paddle Paddle that was hit
     * @details Normalizes velocity vector to maintain constant speed
     */
    public bounce(paddle: Paddle): void
    {
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const hitPosition = (this.positionY - paddle.positionY) / paddle.height - 0.5;
        
        this.velocityX = -this.velocityX * this.speedIncrement;
        this.velocityY = velYfactor * hitPosition;
        const newSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const ratio = (currentSpeed * this.speedIncrement) / newSpeed;
        
        this.velocityX *= ratio;
        this.velocityY *= ratio;
    }

    /**
     * @brief Activate curve effect on the ball
     * @param direction Direction of curve (1 = down, -1 = up)
     */
    public applyCurve(direction: number): void
    {
        this.isCurving = true;
        this.curveDirection = direction;
        console.log(`[BALL] Curve applied: direction ${direction}`);
    }

    /**
     * @brief Remove curve effect from ball
     */
    public removeCurve(): void
    {
        this.isCurving = false;
        this.curveDirection = 0;
        console.log(`[BALL] Curve removed`);
    }

    /**
     * @brief Apply speed boost to ball
     * @param multiplier Speed multiplier (e.g., 1.4)
     */
    public applySpeedBoost(multiplier: number): void
    {
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        
        this.previousSpeed = currentSpeed;
        this.velocityX *= multiplier;
        this.velocityY *= multiplier;
        this.isBoosted = true;
        
        console.log(`[BALL] Speed boost applied: ${currentSpeed.toFixed(0)} -> ${(currentSpeed * multiplier).toFixed(0)}`);
    }

    /**
     * @brief Remove speed boost and restore previous speed with increment
     */
    public removeSpeedBoost(): void
    {
        if (!this.isBoosted || this.previousSpeed === 0)
            return;

        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const targetSpeed = this.previousSpeed * this.speedIncrement;
        const ratio = targetSpeed / currentSpeed;
        
        this.velocityX *= ratio;
        this.velocityY *= ratio;
        this.isBoosted = false;
        this.previousSpeed = 0;
        
        console.log(`[BALL] Speed boost removed: ${currentSpeed.toFixed(0)} -> ${targetSpeed.toFixed(0)}`);
    }

    /**
     * @brief Reset ball to center with opposite direction
     * @param canvasWidth Width of the game canvas
     * @param canvasHeight Height of the game canvas
     */
    public reset(canvasWidth: number, canvasHeight: number): void
    {
        this.positionX = canvasWidth / 2;
        this.positionY = canvasHeight / 2;
        this.velocityX = this.velocityX > 0 ? -200 : 200;
        this.isCurving = false;
        this.curveDirection = 0;
        this.isBoosted = false;
        this.previousSpeed = 0;
        
        this.ballStart(false);
    }

    public render(ctx: CanvasRenderingContext2D, color: string): void
    {
        const centerX = this.positionX + this.size / 2;
        const centerY = this.positionY + this.size / 2;
        
        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        ctx.translate(-this.size / 2, -this.size / 2);
        ctx.fillRect(3, 0, 6, 3);
        ctx.fillRect(0, 3, 12, 3);
        ctx.fillRect(0, 6, 12, 3);
        ctx.fillRect(3, 9, 6, 3);
        ctx.restore();
    }
}
