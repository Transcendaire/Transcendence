import { Paddle } from "./Paddle.js";
/**
 * @brief Player representation with score and paddle
 */
export declare class Player {
    score: number;
    paddle: Paddle;
    readonly name: string;
    /**
     * @brief Constructor
     * @param name Player display name
     * @param paddleX X position for the player's paddle
     * @param paddleY Y position for the player's paddle
     */
    constructor(name: string, paddleX: number, paddleY: number);
    /**
     * @brief Increment player score by one point
     */
    incrementScore(): void;
    /**
     * @brief Reset player score to zero
     */
    resetScore(): void;
}
//# sourceMappingURL=Player.d.ts.map