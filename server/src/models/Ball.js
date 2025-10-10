/**
 * @brief Game ball physics and movement
 */
export class Ball {
    /**
     * @brief Initialize ball direction and velocity
     * @param start True to randomize initial X direction
     */
    ballStart(start) {
        const randomY = Math.random();
        this.velocityY = (randomY - 0.5) * 500;
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
    constructor(positionX, positionY, velocityX = 200) {
        this.positionX = positionX;
        this.positionY = positionY;
        this.velocityX = velocityX;
        this.velocityY = 0;
        this.rotation = 0;
        this.size = 12;
        this.speedIncrement = 1.1;
        this.ballStart(true);
    }
    /**
     * @brief Update ball position and rotation based on delta time
     * @param deltaTime Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        const dt = deltaTime / 1000;
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        this.positionX += this.velocityX * dt;
        this.positionY += this.velocityY * dt;
        this.rotation += speed * dt * 0.01;
    }
    /**
     * @brief Reverse vertical velocity for wall bouncing
     */
    bounceVertical() {
        this.velocityY = -this.velocityY;
    }
    /**
     * @brief Reverse horizontal velocity and apply speed increment
     */
    bounceHorizontal() {
        this.velocityX = -this.velocityX * this.speedIncrement;
    }
    /**
     * @brief Reset ball to center with opposite direction
     * @param canvasWidth Width of the game canvas
     * @param canvasHeight Height of the game canvas
     */
    reset(canvasWidth, canvasHeight) {
        this.positionX = canvasWidth / 2;
        this.positionY = canvasHeight / 2;
        this.velocityX = this.velocityX > 0 ? -200 : 200;
        this.ballStart(false);
    }
}
//# sourceMappingURL=Ball.js.map