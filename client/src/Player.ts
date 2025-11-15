import { Player as ServerPlayer } from "../../server/src/models/Player.js";
import { Paddle } from "./Paddle.js";

/**
 * @brief Client-side player with rendering paddle
 */
export class Player extends ServerPlayer
{
    public override paddle: Paddle;

    /**
     * @brief Constructor
     * @param name Player display name
     * @param paddleX X position for the player's paddle
     * @param paddleY Y position for the player's paddle
     */
    constructor(name: string, paddleX: number, paddleY: number)
    {
        super(name, paddleX);
        
        this.paddle = new Paddle(paddleX, paddleY);
    }
}
