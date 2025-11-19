import { Player } from "@app/shared/models/Player.js";
import { Paddle } from "@app/shared/models/Paddle.js";
import { Ball } from "@app/shared/models/Ball.js";

/**
 * @brief Collision detection utilities
 */
export class CollisionDetector
{
    /**
     * @brief Check if ball is colliding with paddle
     * @param paddle Paddle to check collision with
     * @param ball Ball to check collision for
     * @returns True if collision detected
     */
    public static isTouchingPaddle(paddle: Paddle, ball: Ball): boolean
    {
        return (
            ball.positionX < paddle.positionX + paddle.width &&
            ball.positionX + ball.size > paddle.positionX &&
            ball.positionY < paddle.positionY + paddle.height &&
            ball.positionY + ball.size > paddle.positionY
        );
    }

    /**
     * @brief Check if paddle movement needs reverse effect on ball
     * @param paddle Paddle that hit the ball
     * @param ball Ball that was hit
     * @returns True if reverse effect needed
     */
    public static needsReverseEffect(paddle: Paddle, ball: Ball): boolean
    {
        return (paddle.dir && ball.velocityY > 0) || (!paddle.dir && ball.velocityY < 0);
    }

    /**
     * @brief Check ball collision with top and bottom walls
     * @param ball Ball to check collision for
     * @param canvasHeight Height of the game canvas
     */
    public static checkYCollisions(ball: Ball, canvasHeight: number): void
    {
        if (ball.positionY <= 0 && ball.velocityY < 0 
            || ball.positionY >= canvasHeight - ball.size && ball.velocityY > 0)
            ball.bounceVertical();
    }
}
