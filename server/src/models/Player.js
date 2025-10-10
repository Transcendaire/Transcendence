import { Paddle } from "./Paddle.js";
/**
 * @brief Player representation with score and paddle
 */
export class Player {
    /**
     * @brief Constructor
     * @param name Player display name
     * @param paddleX X position for the player's paddle
     * @param paddleY Y position for the player's paddle
     */
    constructor(name, paddleX, paddleY) {
        this.name = name;
        this.score = 0;
        this.paddle = new Paddle(paddleX, paddleY);
    }
    /**
     * @brief Increment player score by one point
     */
    incrementScore() {
        this.score++;
    }
    /**
     * @brief Reset player score to zero
     */
    resetScore() {
        this.score = 0;
    }
}
//# sourceMappingURL=Player.js.map