import { Player } from "@app/shared/models/Player.js";
import { Paddle } from "@app/shared/models/Paddle.js";
import { Ball } from "@app/shared/models/Ball.js";
import { paddleSize, paddleOffset } from "@app/shared/consts.js";

/**
 * @brief Game logic service handling gameplay mechanics
 */
export class GameService
{
    private player1!: Player;
    private player2!: Player;
    private ball!: Ball;
    private readonly canvasWidth: number;
    private readonly canvasHeight: number;

    /**
     * @brief Constructor
     * @param canvasWidth Width of the game canvas
     * @param canvasHeight Height of the game canvas
     */
    constructor(canvasWidth: number, canvasHeight: number)
    {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        this.initGame();
    }

    /**
     * @brief Initialize game objects with default positions
     */
    private initGame(): void
    {

        this.player1 = new Player("Player 1", paddleOffset);
        this.player2 = new Player("Player 2", this.canvasWidth - paddleOffset - 10);
        this.ball = new Ball(this.canvasWidth / 2, this.canvasHeight / 2);
    }

    /**
     * @brief Get current game state
     * @returns Object containing both players and ball
     */
    public getGameState(): { player1: Player; player2: Player; ball: Ball }
    {
        return {
            player1: this.player1,
            player2: this.player2,
            ball: this.ball
        };
    }

    /**
     * @brief Update game state based on player inputs
     * @param deltaTime Time elapsed since last update
     * @param player1Input Player 1 input state
     * @param player2Input Player 2 input state
     */
    public updateGame(deltaTime: number, player1Input: { up: boolean; down: boolean }, player2Input: { up: boolean; down: boolean }): void
    {
        if (player1Input.up)
            this.player1.paddle.moveUp(deltaTime, this.canvasHeight);
        if (player1Input.down)
            this.player1.paddle.moveDown(deltaTime, this.canvasHeight);
        if (player2Input.up)
            this.player2.paddle.moveUp(deltaTime, this.canvasHeight);
        if (player2Input.down)
            this.player2.paddle.moveDown(deltaTime, this.canvasHeight);
        
        this.ball.update(deltaTime);
        this.checkCollisions();
    }

    /**
     * @brief Check if ball is colliding with paddle
     * @param paddle Paddle to check collision with
     * @param ball Ball to check collision for
     * @returns True if collision detected
     */
    private isTouchingPaddle(paddle: Paddle, ball: Ball): boolean
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
    private needsReverseEffect(paddle: Paddle, ball: Ball): boolean
    {
        return (paddle.dir && ball.velocityY > 0) || (!paddle.dir && ball.velocityY < 0);
    }

    /**
     * @brief Handle paddle collision with ball
     * @param player Player whose paddle is being checked
     * @param ball Ball to check collision for
     * @param antiDoubleTap Prevent double collision detection
     */
    private checkPaddleTouch(player: Player, ball: Ball, antiDoubleTap: boolean): void
    {
        if (antiDoubleTap && this.isTouchingPaddle(player.paddle, ball))
        {
            ball.bounce(player.paddle)
            // if (this.needsReverseEffect(player.paddle, ball))
            //     ball.bounceVertical();
        }
    }

    /**
     * @brief Check if player scored and update score
     * @param player Player to award point to
     * @param ball Ball that went off screen
     * @param cond Condition for scoring
     */
    private checkSide(player: Player, ball: Ball, cond: boolean): void
    {
        if (cond) {
            const oldScore = player.score;
            
            player.incrementScore();
            console.log(`[SERVER] POINT MARQUE! ${player.name}: ${oldScore} -> ${player.score}`);
            console.log(`[SERVER] Score actuel: ${this.player1.name} ${this.player1.score} - ${this.player2.score} ${this.player2.name}`);
            ball.reset(this.canvasWidth, this.canvasHeight);
            this.player1.paddle.positionY = this.canvasHeight / 2 - paddleSize / 2;
            this.player2.paddle.positionY = this.canvasHeight / 2 - paddleSize / 2;
        }
    }

    /**
     * @brief Check scoring conditions for both players
     * @param player1 First player
     * @param player2 Second player
     * @param ball Ball to check position for
     */
    private checkScoring(player1: Player, player2: Player, ball: Ball): void
    {
        this.checkSide(player2, ball, ball.positionX < 0);
        this.checkSide(player1, ball, ball.positionX > this.canvasWidth);
    }

    /**
     * @brief Check ball collision with top and bottom walls
     * @param ball Ball to check collision for
     */
    private checkYCollisions(ball: Ball): void
    {
        if (ball.positionY <= 0 && ball.velocityY < 0 
            || ball.positionY >= this.canvasHeight - ball.size && ball.velocityY > 0)
            ball.bounceVertical();
    }

    /**
     * @brief Check all game collisions
     */
    private checkCollisions(): void
    {
        this.checkYCollisions(this.ball);
        this.checkPaddleTouch(this.player1, this.ball, this.ball.velocityX < 0);
        this.checkPaddleTouch(this.player2, this.ball, this.ball.velocityX > 0);
        this.checkScoring(this.player1, this.player2, this.ball);
    }


    private winGame(): void
    {

    }
}
