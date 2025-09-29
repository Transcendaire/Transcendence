import { Player } from "../models/Player.js";
import { Paddle } from "../models/Paddle.js";
import { Ball } from "../models/Ball.js";

export class GameService
{
    private player1!: Player;
    private player2!: Player;
    private ball!: Ball;
    private readonly canvasWidth: number;
    private readonly canvasHeight: number;

    constructor(canvasWidth: number, canvasHeight: number)
    {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.initGame();
    }

    private initGame(): void
    {
        const paddleOffset = 30;
        const paddleY = this.canvasHeight / 2 - 50;

        this.player1 = new Player("Player 1", paddleOffset, paddleY);
        this.player2 = new Player("Player 2", this.canvasWidth - paddleOffset - 10, paddleY);
        this.ball = new Ball(this.canvasWidth / 2, this.canvasHeight / 2);
    }

    public getGameState(): { player1: Player; player2: Player; ball: Ball }
    {
        return {
            player1: this.player1,
            player2: this.player2,
            ball: this.ball
        };
    }

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
	}    private isTouchingPaddle(paddle: Paddle, ball: Ball): boolean
    {
        return (
            ball.positionX < paddle.positionX + paddle.width &&
            ball.positionX + ball.size > paddle.positionX &&
            ball.positionY < paddle.positionY + paddle.height &&
            ball.positionY + ball.size > paddle.positionY
        );
    }

    private needsReverseEffect(paddle: Paddle, ball: Ball): boolean
    {
        return (paddle.dir && ball.velocityY > 0) || (!paddle.dir && ball.velocityY < 0);
    }

    private checkPaddleTouch(player: Player, ball: Ball, antiDoubleTap: boolean): void
    {
        if (antiDoubleTap && this.isTouchingPaddle(player.paddle, ball))
        {
            ball.bounceHorizontal();
            if (this.needsReverseEffect(player.paddle, ball))
                ball.bounceVertical();
        }
    }

    private checkSide(player: Player, ball: Ball, cond: boolean): void
    {
        if (cond)
        {
            const oldScore = player.score;
            player.incrementScore();
            console.log(`[SERVER] POINT MARQUE! ${player.name}: ${oldScore} -> ${player.score}`);
            console.log(`[SERVER] Score actuel: ${this.player1.name} ${this.player1.score} - ${this.player2.score} ${this.player2.name}`);
            ball.reset(this.canvasWidth, this.canvasHeight);
        }
    }

    private checkScoring(player1: Player, player2: Player, ball: Ball): void
    {
        this.checkSide(player2, ball, ball.positionX < 0);
        this.checkSide(player1, ball, ball.positionX > this.canvasWidth);
    }

    private checkYCollisions(ball: Ball): void
    {
        if (ball.positionY <= 0 || ball.positionY >= this.canvasHeight - ball.size)
            ball.bounceVertical();
    }

    private checkCollisions(): void
    {
        this.checkYCollisions(this.ball);
        this.checkPaddleTouch(this.player1, this.ball, this.ball.velocityX < 0);
        this.checkPaddleTouch(this.player2, this.ball, this.ball.velocityX > 0);
        this.checkScoring(this.player1, this.player2, this.ball);
    }
}
