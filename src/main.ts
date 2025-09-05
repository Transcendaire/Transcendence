import { Player } from "./Player.js";
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

function checkCollisions(): void
{
    if (ball.positionY <= 0 || ball.positionY >= canvas.height - ball.size)
        ball.bounceVertical();

    if (ball.positionX <= player1.paddle.positionX + player1.paddle.width &&
        ball.positionX + ball.size >= player1.paddle.positionX &&
        ball.positionY <= player1.paddle.positionY + player1.paddle.height &&
        ball.positionY + ball.size >= player1.paddle.positionY &&
        ball.velocityX < 0)
        ball.bounceHorizontal();

    if (ball.positionX <= player2.paddle.positionX + player2.paddle.width &&
        ball.positionX + ball.size >= player2.paddle.positionX &&
        ball.positionY <= player2.paddle.positionY + player2.paddle.height &&
        ball.positionY + ball.size >= player2.paddle.positionY &&
        ball.velocityX > 0)
        ball.bounceHorizontal();

    if (ball.positionX < 0) {
        player2.incrementScore();
        ball.reset(canvas.width, canvas.height);
    }
    if (ball.positionX > canvas.width) {
        player1.incrementScore();
        ball.reset(canvas.width, canvas.height);
    }
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
