import { Player, PowerUp } from "../models/Player.js";
import { Paddle } from "../models/Paddle.js";
import { Ball } from "../models/Ball.js";
import { paddleSize, paddleOffset } from "../consts.js";

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
    private readonly isCustomMode: boolean;

    /**
     * @brief Constructor
     * @param canvasWidth Width of the game canvas
     * @param canvasHeight Height of the game canvas
     * @param isCustomMode Enable custom mode with power-ups
     */
    constructor(canvasWidth: number, canvasHeight: number,
        isCustomMode: boolean = false)
    {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.isCustomMode = isCustomMode;
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
    public updateGame(deltaTime: number,
        player1Input: { up: boolean; down: boolean; slot1?: boolean;
            slot2?: boolean; slot3?: boolean },
        player2Input: { up: boolean; down: boolean; slot1?: boolean;
            slot2?: boolean; slot3?: boolean }): void
    {
        if (player1Input.up)
            this.player1.paddle.moveUp(deltaTime, this.canvasHeight);
        if (player1Input.down)
            this.player1.paddle.moveDown(deltaTime, this.canvasHeight);
        if (player2Input.up)
            this.player2.paddle.moveUp(deltaTime, this.canvasHeight);
        if (player2Input.down)
            this.player2.paddle.moveDown(deltaTime, this.canvasHeight);
        if (this.isCustomMode) {
            if (player1Input.slot1)
                this.usePowerUpSlot(this.player1, 0);
            if (player1Input.slot2)
                this.usePowerUpSlot(this.player1, 1);
            if (player1Input.slot3)
                this.usePowerUpSlot(this.player1, 2);
            if (player2Input.slot1)
                this.usePowerUpSlot(this.player2, 0);
            if (player2Input.slot2)
                this.usePowerUpSlot(this.player2, 1);
            if (player2Input.slot3)
                this.usePowerUpSlot(this.player2, 2);
        }
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
     * @param opponent Opponent player
     * @param ball Ball to check collision for
     * @param antiDoubleTap Prevent double collision detection
     */
    private checkPaddleTouch(player: Player, opponent: Player, ball: Ball,
        antiDoubleTap: boolean): void
    {
        if (antiDoubleTap && this.isTouchingPaddle(player.paddle, ball))
        {
            ball.bounce(player.paddle)
            if (this.isCustomMode) {
                const pendingPowerUps = player.consumePendingPowerUps();
                
                if (pendingPowerUps.length > 0) {
                    console.log(`[SERVER] ${player.name} applying pending power-ups: ${pendingPowerUps.join(', ')}`);
                    pendingPowerUps.forEach(powerUp => {
                        this.activatePowerUp(player, powerUp);
                    });
                }
                player.incrementHitStreak();
                console.log(`[SERVER] ${player.name} hit streak: ${player.hitStreak} (${opponent.name} was at ${opponent.hitStreak})`);
                if (player.hitStreak >= 3) {
                    this.awardRandomPowerUp(player);
                    player.resetHitStreak();
                }
            }
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
            if (this.isCustomMode) {
                this.player1.clearPendingPowerUps();
                this.player2.clearPendingPowerUps();
                console.log(`[SERVER] Pending power-ups cleared for both players`);
            }
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
        this.checkPaddleTouch(this.player1, this.player2, this.ball,
            this.ball.velocityX < 0);
        this.checkPaddleTouch(this.player2, this.player1, this.ball,
            this.ball.velocityX > 0);
        this.checkScoring(this.player1, this.player2, this.ball);
    }

    /**
     * @brief Award random power-up to player
     * @param player Player to award power-up to
     * @details Respects slot constraints and existing power-ups
     */
    private awardRandomPowerUp(player: Player): void
    {
        const availablePowerUps: PowerUp[] = [];

        if (!player.hasPowerUp('Son'))
            availablePowerUps.push('Son');
        if (!player.hasPowerUp('Pi'))
            availablePowerUps.push('Pi');
        if (!player.hasPowerUp('16'))
            availablePowerUps.push('16');
        
        console.log(`[SERVER] ${player.name} eligible for power-up. Available: ${availablePowerUps.join(', ')}`);
        
        if (availablePowerUps.length === 0) {
            console.log(`[SERVER] ${player.name} has all power-ups already`);
            return;
        }
        
        const randomIndex = Math.floor(Math.random() *
            availablePowerUps.length);
        const powerUp = availablePowerUps[randomIndex];

        if (powerUp) {
            const success = player.addPowerUp(powerUp);
            console.log(`[SERVER] ${player.name} awarded power-up: ${powerUp} (success: ${success})`);
            console.log(`[SERVER] ${player.name} current slots: ${player.itemSlots.join(', ')}`);
        }
    }

    /**
     * @brief Activate power-up effect
     * @param player Player using the power-up
     * @param powerUp Power-up to activate
     */
    private activatePowerUp(player: Player, powerUp: PowerUp): void
    {
        if (!powerUp)
            return;
        console.log(`[GameService] ${player.name} activated ${powerUp}`);
    }

    /**
     * @brief Handle power-up activation input
     * @param player Player activating power-up
     * @param slotIndex Slot index (0=Son, 1=Pi, 2=16)
     */
    public usePowerUpSlot(player: Player, slotIndex: number): void
    {
        if (!this.isCustomMode)
            return;
        const powerUp = player.activatePowerUp(slotIndex);

        if (powerUp) {
            console.log(`[SERVER] ${player.name} registered ${powerUp} for next bounce. Pending: ${player.pendingPowerUps.join(', ')}`);
        }
    }

    private winGame(): void
    {

    }
}
