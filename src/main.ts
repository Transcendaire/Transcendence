import { Player } from "./Player.js";
import { Paddle } from "./Paddle.js";
import { Ball } from "./Ball.js";
import { COLORS, FONTS } from "./constants.js";

const canvas = document.getElementById("pong") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let lastTime = 0;
let player1: Player;
let player2: Player;
let ball: Ball;

const keys = {
    KeyA: false,
    KeyQ: false,
    KeyD: false,
    KeyW: false,
    KeyZ: false,
    KeyS: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

function initGame(): void
{
    const paddleOffset = 30;
    const paddleY = canvas.height / 2 - 50;

    player1 = new Player("Player 1", paddleOffset, paddleY);
    player2 = new Player("Player 2", canvas.width - paddleOffset - 10, paddleY);
    ball = new Ball(canvas.width / 2, canvas.height / 2);

    setupEventListeners();
}

function setupEventListeners(): void
{
    document.addEventListener('keydown', (event) => {
        if (event.code in keys)
            keys[event.code as keyof typeof keys] = true;
    });

    document.addEventListener('keyup', (event) => {
        if (event.code in keys)
            keys[event.code as keyof typeof keys] = false;
    });
}

function gameLoop(currentTime: number): void
{
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

function update(deltaTime: number): void
{
    if ( keys.KeyQ || keys.KeyW || keys.KeyZ || keys.KeyA) 
        player1.paddle.moveUp(deltaTime, canvas.height);
    if (keys.KeyD || keys.KeyS)
        player1.paddle.moveDown(deltaTime, canvas.height);

    if (keys.ArrowUp || keys.ArrowRight)
        player2.paddle.moveUp(deltaTime, canvas.height);
    if (keys.ArrowDown || keys.ArrowLeft)
        player2.paddle.moveDown(deltaTime, canvas.height);

    ball.update(deltaTime);
    checkCollisions();
}

function isTouchingPaddle(paddle: Paddle, ball: Ball): boolean
{
    return (
        ball.positionX < paddle.positionX + paddle.width &&
        ball.positionX + ball.size > paddle.positionX &&
        ball.positionY < paddle.positionY + paddle.height &&
        ball.positionY + ball.size > paddle.positionY
    );
}

function needsReverseEffect(paddle: Paddle, ball: Ball) : boolean
{
    return (paddle.dir && ball.velocityY > 0) || (!paddle.dir && ball.velocityY < 0);
}

function checkPaddleTouch(player: Player, ball: Ball, antiDoubleTap: boolean): void
{
    if (antiDoubleTap && isTouchingPaddle(player.paddle, ball))
    {
        ball.bounceHorizontal();
        if (needsReverseEffect(player.paddle, ball))
            ball.bounceVertical();
    }
}


function checkSide(player: Player, ball: Ball, cond: boolean): void
{
    if (cond)
    {
        player.incrementScore();
        ball.reset(canvas.width, canvas.height);
    }
}

function checkScoring(player1: Player, player2: Player, ball: Ball): void
{
    checkSide(player2, ball, ball.positionX < 0);
    checkSide(player1, ball, ball.positionX > canvas.width);
}

function checkYCollisions(ball: Ball): void
{
    if (ball.positionY <= 0 || ball.positionY >= canvas.height - ball.size)
        ball.bounceVertical();
}

function checkCollisions(): void
{
    checkYCollisions(ball);
    checkPaddleTouch(player1, ball, ball.velocityX < 0);
    checkPaddleTouch(player2, ball, ball.velocityX > 0);
    checkScoring(player1, player2, ball);
}

function render(): void
{
    ctx.fillStyle = COLORS.BLACK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    player1.paddle.render(ctx, COLORS.SONPI16_ORANGE);
    player2.paddle.render(ctx, COLORS.SONPI16_ORANGE);
    ball.render(ctx, COLORS.SONPI16_ORANGE);

    renderScore();
}

function renderScore(): void
{
    ctx.fillStyle = COLORS.SONPI16_ORANGE;
    ctx.font = `bold 48px ${FONTS.QUENCY_PIXEL}`;
    ctx.textAlign = "center";
    ctx.fillText(`${player1.score} - ${player2.score}`, canvas.width / 2, 60);
}

initGame();
gameLoop(0);
