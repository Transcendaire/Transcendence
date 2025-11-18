import { Player } from "@app/shared/models/Player.js";
import { Ball } from "@app/shared/models/Ball.js";
import { CloneBall } from "@app/shared/models/CloneBall.js";
import { PowerUpFruit } from "@app/shared/types.js";
import { paddleOffset, speedBoost } from "@app/shared/consts.js";
import { PowerUpManager } from "./powerup.js";
import { CollisionDetector } from "./collision.js";
import { ScoringManager } from "./scoring.js";

/**
 * @brief Game logic service handling gameplay mechanics
 */
export class GameService
{
    private player1!: Player;
    private player2!: Player;
    private ball!: Ball;
    private cloneBalls: CloneBall[];
    private fruits: PowerUpFruit[];
    private fruitSpawnTimer: number;
    private ballTouched: boolean;
    private readonly fruitSpawnInterval: number;
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
        this.cloneBalls = [];
        this.fruits = [];
        this.fruitSpawnTimer = 0;
        this.ballTouched = false;
        this.fruitSpawnInterval = 5000;
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
     * @returns Object containing both players, ball, and clones
     */
    public getGameState(): { player1: Player; player2: Player; ball: Ball; cloneBalls: CloneBall[]; fruits: PowerUpFruit[] }
    {
        return {
            player1: this.player1,
            player2: this.player2,
            ball: this.ball,
            cloneBalls: this.cloneBalls,
            fruits: this.fruits
        };
    }

    /**
     * @brief Create clone balls with angle variations
     * @param count Number of clones to create
     */
    public createCloneBalls(count: number): void
    {
        this.cloneBalls = [];
        const ballDirection = Math.sign(this.ball.velocityX);
        const speed = Math.sqrt(this.ball.velocityX * this.ball.velocityX + this.ball.velocityY * this.ball.velocityY);
        const speedBoostMultiplier = this.ball.isBoosted ? speedBoost : 1.0;
        const angleRange = this.ball.isCurving ? (2 * Math.PI) / 3 : Math.PI / 2;
        const angleStart = -angleRange / 2;
        const angleStep = angleRange / (count - 1);

        for (let i = 0; i < count; i++)
        {
            const angle = angleStart + angleStep * i;
            const vx = Math.cos(angle) * speed * ballDirection;
            const vy = Math.sin(angle) * speed;
            const clone = new CloneBall(this.ball.positionX, this.ball.positionY, vx, vy, speedBoostMultiplier);

            if (this.ball.isCurving)
                clone.applyCurve(this.ball.curveDirection);
            this.cloneBalls.push(clone);
        }

        console.log(`[GAME] Created ${count} clone balls (direction: ${ballDirection > 0 ? 'right' : 'left'}, curving: ${this.ball.isCurving}, boosted: ${this.ball.isBoosted})`);
    }

    /**
     * @brief Apply speed boost to all existing clone balls
     * @param multiplier Speed multiplier from Son effect
     */
    public boostCloneBalls(multiplier: number): void
    {
        this.cloneBalls.forEach(clone => {
            clone.applySpeedBoost(multiplier);
        });
        console.log(`[GAME] Applied speed boost ${multiplier}x to ${this.cloneBalls.length} clone balls`);
    }

    /**
     * @brief Apply curve to all existing clone balls
     * @param direction Direction of curve (1 = down, -1 = up)
     */
    public curveCloneBalls(direction: number): void
    {
        this.cloneBalls.forEach(clone => {
            clone.applyCurve(direction);
        });
        console.log(`[GAME] Applied curve direction ${direction} to ${this.cloneBalls.length} clone balls`);
    }

    /**
     * @brief Clear all clone balls
     */
    public clearCloneBalls(): void
    {
        this.cloneBalls = [];
        console.log(`[GAME] Cleared all clone balls`);
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
        this.updateCloneBalls(deltaTime);
        this.updateFruitSpawning(deltaTime);
        this.checkCollisions();
        this.checkFruitCollisions();
    }

    /**
     * @brief Update clone balls physics (wall bounces only)
     * @param deltaTime Time elapsed since last update
     */
    private updateCloneBalls(deltaTime: number): void
    {
        this.cloneBalls.forEach(clone => {
            clone.update(deltaTime);

            if (clone.positionY <= 0 || clone.positionY + clone.size >= this.canvasHeight)
            {
                clone.bounceVertical();
                if (clone.positionY <= 0)
                    clone.positionY = 0;
                else if (clone.positionY + clone.size >= this.canvasHeight)
                    clone.positionY = this.canvasHeight - clone.size;
            }
        });
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
        if (antiDoubleTap && CollisionDetector.isTouchingPaddle(player.paddle, ball))
        {
            ball.bounce(player.paddle)
            this.ballTouched = true;

            if (ball.isCurving)
                ball.removeCurve();
            if (ball.isBoosted)
                ball.removeSpeedBoost();
            if (this.cloneBalls.length > 0)
                this.clearCloneBalls();

            if (this.isCustomMode)
            {
                PowerUpManager.applyPendingPowerUps(player, ball, this);
                
                if (player.hitStreak === 0 && !player.chargingPowerUp)
                {
                    const selected = player.selectRandomChargingPowerUp();
                    if (selected)
                    {
                        player.incrementHitStreak();
                        console.log(`[SERVER] ${player.name} started charging ${selected}`);
                    }
                }
                else if (player.chargingPowerUp)
                    player.incrementHitStreak();

                console.log(`[SERVER] ${player.name} hit streak: ${player.hitStreak} (charging: ${player.chargingPowerUp})`);

                if (player.hitStreak >= 3 && player.chargingPowerUp)
                {
                    PowerUpManager.awardRandomPowerUp(player);
                    player.resetHitStreak();
                }
            }
        }
    }

    /**
     * @brief Check if player scored and update score
     * @param player Player to award point to
     * @param opponent Opponent player
     * @param ball Ball that went off screen
     * @param cond Condition for scoring
     */
    private checkSide(player: Player, opponent: Player, ball: Ball, cond: boolean): void
    {
        if (ScoringManager.checkScoreCondition(ball, cond))
        {
            if (this.cloneBalls.length > 0)
                this.clearCloneBalls();
            this.ballTouched = false;
            ScoringManager.handleScore(
                player,
                opponent,
                ball,
                this.canvasWidth,
                this.canvasHeight,
                this.isCustomMode
            );
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
        this.checkSide(player2, player1, ball, ball.positionX < 0);
        this.checkSide(player1, player2, ball, ball.positionX > this.canvasWidth);
    }

    /**
     * @brief Check all game collisions
     */
    private checkCollisions(): void
    {
        CollisionDetector.checkYCollisions(this.ball, this.canvasHeight);
        this.checkPaddleTouch(this.player1, this.player2, this.ball,
            this.ball.velocityX < 0);
        this.checkPaddleTouch(this.player2, this.player1, this.ball,
            this.ball.velocityX > 0);
        this.checkScoring(this.player1, this.player2, this.ball);
    }

    /**
     * @brief Handle power-up activation/cancellation input (toggle)
     * @param player Player toggling power-up
     * @param slotIndex Slot index (0=Son, 1=Pi, 2=16)
     */
    public usePowerUpSlot(player: Player, slotIndex: number): void
    {
        if (!this.isCustomMode)
            return;

        if (player.selectedSlots[slotIndex])
        {
            const cancelled = player.cancelPowerUp(slotIndex);
            if (cancelled)
                console.log(`[SERVER] ${player.name} cancelled power-up at slot ${slotIndex}. Pending: ${player.pendingPowerUps.join(', ')}`);
        }
        else
        {
            const powerUp = player.activatePowerUp(slotIndex);
            if (powerUp)
                console.log(`[SERVER] ${player.name} registered ${powerUp} for next bounce. Pending: ${player.pendingPowerUps.join(', ')}`);
        }
    }

    /**
     * @brief Spawn power-up fruit at random middle position
     */
    private spawnFruit(): void
    {
        const minX = this.canvasWidth * 0.25;
        const maxX = this.canvasWidth * 0.75;
        const minY = 50;
        const maxY = this.canvasHeight - 50;
        const fruit: PowerUpFruit = {
            id: Math.random().toString(36).substr(2, 9),
            x: minX + Math.random() * (maxX - minX),
            y: minY + Math.random() * (maxY - minY),
            rotation: 0
        };

        this.fruits.push(fruit);
        console.log(`[GAME] Spawned fruit at (${fruit.x.toFixed(0)}, ${fruit.y.toFixed(0)})`);
    }

    /**
     * @brief Update fruit spawn timer and spawn new fruits
     * @param deltaTime Time elapsed since last update
     */
    private updateFruitSpawning(deltaTime: number): void
    {
        if (!this.isCustomMode)
            return;
        this.fruitSpawnTimer += deltaTime;
        if (this.fruitSpawnTimer >= this.fruitSpawnInterval)
        {
            if (this.fruits.length < 3)
                this.spawnFruit();
            this.fruitSpawnTimer = 0;
        }
    }

    /**
     * @brief Check ball collision with fruits and award bonus
     */
    private checkFruitCollisions(): void
    {
        const ballSize = this.ball.size;
        const fruitSize = 30;

        for (let i = this.fruits.length - 1; i >= 0; i--)
        {
            const fruit = this.fruits[i];
            if (!fruit)
                continue;

            const collides = (
                this.ball.positionX < fruit.x + fruitSize &&
                this.ball.positionX + ballSize > fruit.x &&
                this.ball.positionY < fruit.y + fruitSize &&
                this.ball.positionY + ballSize > fruit.y
            );

            if (collides && this.ballTouched)
            {
                const player = this.ball.velocityX > 0 ? this.player1 : this.player2;

                PowerUpManager.awardFruitBonus(player);
                this.fruits.splice(i, 1);
                console.log(`[GAME] ${player.name} collected fruit at (${fruit.x.toFixed(0)}, ${fruit.y.toFixed(0)})`);
            }
        }
    }
}
