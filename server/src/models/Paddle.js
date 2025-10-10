/**
 * @brief Game paddle for player control
 */
export class Paddle {
    /**
     * @brief Constructor
     * @param positionX Fixed X position of the paddle
     * @param positionY Initial Y position of the paddle
     * @param width Paddle width
     * @param height Paddle height
     * @param speed Movement speed
     */
    constructor(positionX, positionY, width = 10, height = 100, speed = 400) {
        this.positionX = positionX;
        this.positionY = positionY;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.dir = false;
    }
    /**
     * @brief Move paddle upward with bounds checking
     * @param deltaTime Time elapsed since last update in milliseconds
     * @param canvasHeight Height of the game canvas
     */
    moveUp(deltaTime, canvasHeight) {
        this.positionY = Math.max(0, this.positionY - this.speed * (deltaTime / 1000));
        this.dir = true;
    }
    /**
     * @brief Move paddle downward with bounds checking
     * @param deltaTime Time elapsed since last update in milliseconds
     * @param canvasHeight Height of the game canvas
     */
    moveDown(deltaTime, canvasHeight) {
        this.positionY = Math.min(canvasHeight - this.height, this.positionY + this.speed * (deltaTime / 1000));
        this.dir = false;
    }
}
//# sourceMappingURL=Paddle.js.map