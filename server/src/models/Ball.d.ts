/**
 * @brief Game ball physics and movement
 */
export declare class Ball {
    positionX: number;
    positionY: number;
    velocityX: number;
    velocityY: number;
    rotation: number;
    readonly size: number;
    readonly speedIncrement: number;
    /**
     * @brief Initialize ball direction and velocity
     * @param start True to randomize initial X direction
     */
    ballStart(start: boolean): void;
    /**
     * @brief Constructor
     * @param positionX Initial X position
     * @param positionY Initial Y position
     * @param velocityX Initial X velocity
     */
    constructor(positionX: number, positionY: number, velocityX?: number);
    /**
     * @brief Update ball position and rotation based on delta time
     * @param deltaTime Time elapsed since last update in milliseconds
     */
    update(deltaTime: number): void;
    /**
     * @brief Reverse vertical velocity for wall bouncing
     */
    bounceVertical(): void;
    /**
     * @brief Reverse horizontal velocity and apply speed increment
     */
    bounceHorizontal(): void;
    /**
     * @brief Reset ball to center with opposite direction
     * @param canvasWidth Width of the game canvas
     * @param canvasHeight Height of the game canvas
     */
    reset(canvasWidth: number, canvasHeight: number): void;
}
//# sourceMappingURL=Ball.d.ts.map