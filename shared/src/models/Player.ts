import { Paddle } from "./Paddle.js";
import { canvasHeight, paddleSize } from "../consts.js"
/**
 * @brief Player representation with score and paddle
 */
export class Player
{
    public score: number;
    public paddle: Paddle;
    public name: string;

    /**
     * @brief Constructor
     * @param name Player display name
     * @param paddleX X position for the player's paddle
     * @param paddleY Y position for the player's paddle
     */
    constructor(name: string, paddleX: number)
    {
        this.name = name;
        this.score = 0;
        
        this.paddle = new Paddle(paddleX, canvasHeight / 2 - paddleSize / 2);
    }

    /**
     * @brief Increment player score by one point
     */
    public incrementScore(): void
    {
        this.score++;
    }

    /**
     * @brief Reset player score to zero
     */
    public resetScore(): void
    {
        this.score = 0;
    }
}
