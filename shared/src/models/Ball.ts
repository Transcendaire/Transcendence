import { Paddle } from "./Paddle.js";
import { Point2D } from "../types.js";
import {
    curveAcceleration,
    BR_BALL_INITIAL_SPEED,
    CLASSIC_BALL_INITIAL_SPEED,
    CLASSIC_BALL_RESET_SPEED
} from "../consts.js";

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
     * @param polygonMode If true, use slower speed and 360° direction
     */
    constructor(positionX: number, positionY: number, velocityX: number = CLASSIC_BALL_INITIAL_SPEED, polygonMode: boolean = false)
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
        
        if (polygonMode)
        {
            const angle = Math.random() * Math.PI * 2;
            this.velocityX = Math.cos(angle) * BR_BALL_INITIAL_SPEED;
            this.velocityY = Math.sin(angle) * BR_BALL_INITIAL_SPEED;
        }
        else
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
        this.velocityX = this.velocityX > 0 ? -CLASSIC_BALL_RESET_SPEED : CLASSIC_BALL_RESET_SPEED;
        this.isCurving = false;
        this.curveDirection = 0;
        this.isBoosted = false;
        this.previousSpeed = 0;
        
        this.ballStart(false);
    }

    /**
     * @brief Reset ball to specific center with random 360° direction (for polygon mode)
     * @param centerX X position of center
     * @param centerY Y position of center
     * @param randomDirection Use random direction instead of opposite
     */
    public resetToPoint(centerX: number, centerY: number, randomDirection: boolean = true): void
    {
        this.positionX = centerX;
        this.positionY = centerY;
        this.isCurving = false;
        this.curveDirection = 0;
        this.isBoosted = false;
        this.previousSpeed = 0;
        if (randomDirection)
        {
            const angle = Math.random() * Math.PI * 2;
            this.velocityX = Math.cos(angle) * BR_BALL_INITIAL_SPEED;
            this.velocityY = Math.sin(angle) * BR_BALL_INITIAL_SPEED;
        }
        else
            this.ballStart(false);
    }

    /**
     * @brief Push ball toward a point (for polygon boundary correction)
     * @param targetX Target X position
     * @param targetY Target Y position
     * @param distance Distance to push
     */
    public pushToward(targetX: number, targetY: number, distance: number): void
    {
        const dx = targetX - this.positionX;
        const dy = targetY - this.positionY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0)
        {
            this.positionX += (dx / dist) * distance;
            this.positionY += (dy / dist) * distance;
        }
    }

    /**
     * @brief Push ball away from a point
     * @param pointX Point X position
     * @param pointY Point Y position
     * @param distance Distance to push
     */
    public pushAwayFrom(pointX: number, pointY: number, distance: number): void
    {
        const dx = this.positionX - pointX;
        const dy = this.positionY - pointY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0)
        {
            this.positionX += (dx / dist) * distance;
            this.positionY += (dy / dist) * distance;
        }
    }

    /**
     * @brief Bounce on polygon paddle with angle interpolation
     * @param paddleCenter Center position of the paddle
     * @param paddleAngle Angle of the paddle (radians)
     * @param paddleLength Length of the paddle
     * @param sideNormal Normal vector pointing inward from the side
     */
    public bouncePolygon(
        paddleCenter: Point2D,
        paddleAngle: number,
        paddleLength: number,
        sideNormal: Point2D
    ): void
    {
        const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        const ballCenterX = this.positionX + this.size / 2;
        const ballCenterY = this.positionY + this.size / 2;

        const alongX = Math.cos(paddleAngle);
        const alongY = Math.sin(paddleAngle);
        const toBallX = ballCenterX - paddleCenter.x;
        const toBallY = ballCenterY - paddleCenter.y;
        const hitOffset = toBallX * alongX + toBallY * alongY;
        const hitPosition = hitOffset / (paddleLength / 2);
        const clampedHit = Math.max(-1, Math.min(1, hitPosition));

        const baseAngle = Math.atan2(sideNormal.y, sideNormal.x);
        const maxDeflection = Math.PI / 3;
        const deflection = -clampedHit * maxDeflection;
        const newAngle = baseAngle + deflection;

        const newSpeed = currentSpeed * this.speedIncrement;
        this.velocityX = Math.cos(newAngle) * newSpeed;
        this.velocityY = Math.sin(newAngle) * newSpeed;
        
        console.log(`[BALL] bouncePolygon: hitPos=${clampedHit.toFixed(2)}, deflection=${(deflection * 180 / Math.PI).toFixed(1)}°, speed=${newSpeed.toFixed(0)}`);
    }

    /**
     * @brief Get ball center position
     * @returns Center point of the ball
     */
    public getCenter(): Point2D
    {
        return {
            x: this.positionX + this.size / 2,
            y: this.positionY + this.size / 2
        };
    }

    /**
     * @brief Get ball radius
     * @returns Ball radius
     */
    public getRadius(): number
    {
        return this.size / 2;
    }
}
