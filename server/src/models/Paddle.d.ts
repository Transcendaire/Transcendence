/**
 * @brief Game paddle for player control
 */
export declare class Paddle {
    positionY: number;
    dir: boolean;
    readonly positionX: number;
    readonly width: number;
    readonly height: number;
    readonly speed: number;
    /**
     * @brief Constructor
     * @param positionX Fixed X position of the paddle
     * @param positionY Initial Y position of the paddle
     * @param width Paddle width
     * @param height Paddle height
     * @param speed Movement speed
     */
    constructor(positionX: number, positionY: number, width?: number, height?: number, speed?: number);
    /**
     * @brief Move paddle upward with bounds checking
     * @param deltaTime Time elapsed since last update in milliseconds
     * @param canvasHeight Height of the game canvas
     */
    moveUp(deltaTime: number, canvasHeight: number): void;
    /**
     * @brief Move paddle downward with bounds checking
     * @param deltaTime Time elapsed since last update in milliseconds
     * @param canvasHeight Height of the game canvas
     */
    moveDown(deltaTime: number, canvasHeight: number): void;
}
//# sourceMappingURL=Paddle.d.ts.map