import { Player } from "@shared/models/Player.js";
import { Ball } from "@shared/models/Ball.js";
import { WebSocketClient } from "../components/WebSocketClient.js";
import { GameState, GameInput } from "@shared/types.js";
import { inputParserClass } from "../components/inputParser.js"
import { paddleSize, paddleOffset} from "@shared/consts.js";
import { COLORS, FONTS } from "../components/consts.js";
import { registerPageInitializer , navigate } from "../router.js";

const canvas = document.getElementById("pong") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const inputParser = new inputParserClass();

let lastTime = 0;
let player1: Player;
let player2: Player;
let ball: Ball;
let wsClient = new WebSocketClient();
let currentPlayerRole: 'player1' | 'player2' | null = null;
let gameRunning = false;

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

/**
 * @brief init the game logic, his events and websocket
 */
function initGame(): void
{
    wsClient.onWaitingForPlayer = () => {
        showWaitingScreen();
    };
    wsClient.onPlayerJoined = (playerCount: number) => {
        updatePlayerCount(playerCount);
    };
    wsClient.onGameStart = (playerRole: 'player1' | 'player2') => {
        currentPlayerRole = playerRole;
        startGame(playerRole);
    };
    wsClient.onGameState = (gameState: GameState) => {
        updateGameState(gameState);
    };
    wsClient.onDisconnected = () => {
        alert("Connexion perdue avec le serveur");
        returnToLobby();
    };
    wsClient.onError = (error: string) => {
        alert(error);
    };
}

/**
 * @brief Setup keyboard event listeners for game controls
 */
function setupGameEventListeners(): void
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

/**
 * @brief Main game loop
 * @param currentTime Current timestamp
 */
function gameLoop(currentTime: number): void
{
    const deltaTime = currentTime - lastTime;
    
    if (!gameRunning)
        return;
    lastTime = currentTime;
    sendInputToServer();
    render();
    updatePing();
    requestAnimationFrame(gameLoop);
}

function sendInputToServer(): void
{
    if (!wsClient.isConnected() || !currentPlayerRole) return;

    const input: GameInput = {
        playerId: currentPlayerRole,
        keys: {
            up: keys.KeyQ || keys.KeyW || keys.KeyZ || keys.KeyA || keys.ArrowUp || keys.ArrowRight,
            down: keys.KeyD || keys.KeyS || keys.ArrowDown || keys.ArrowLeft
        }
    };

    wsClient.sendInput(input);
}

function updateGameState(gameState: GameState): void
{
    if (!player1 || !player2 || !ball) return;

    // Vérifier si quelqu'un a marqué un point
    const oldScore1 = player1.score;
    const oldScore2 = player2.score;

    player1.paddle.positionY = gameState.player1.paddle.y;
    player1.score = gameState.player1.score;
    
    player2.paddle.positionY = gameState.player2.paddle.y;
    player2.score = gameState.player2.score;
    
    ball.positionX = gameState.ball.x;
    ball.positionY = gameState.ball.y;
    ball.velocityX = gameState.ball.vx;
    ball.velocityY = gameState.ball.vy;

    // Logger les changements de score
    if (player1.score > oldScore1) {
        console.log(`[GAME] POINT POUR PLAYER 1! Score: ${player1.score} - ${player2.score}`);
    }
    if (player2.score > oldScore2) {
        console.log(`[GAME] POINT POUR PLAYER 2! Score: ${player1.score} - ${player2.score}`);
    }

    // Logger toutes les informations de la partie (moins fréquent)
    if (Math.random() < 0.05) { // 5% de chance à chaque frame
        console.log('[GAME] Etat du jeu:', {
            score: `${player1.score} - ${player2.score}`,
            ball: {
                position: `(${Math.round(gameState.ball.x)}, ${Math.round(gameState.ball.y)})`,
                velocity: `(${Math.round(gameState.ball.vx)}, ${Math.round(gameState.ball.vy)})`
            },
            paddles: {
                player1: Math.round(gameState.player1.paddle.y),
                player2: Math.round(gameState.player2.paddle.y)
            },
            playerRole: currentPlayerRole
        });
    }
}

function showWaitingScreen(): void
{
    const lobbyContent = document.getElementById("lobby-content")!;
    const waitingDiv = document.getElementById("waiting")!;
    
    lobbyContent.classList.add("hidden");
    waitingDiv.classList.remove("hidden");
}

function updatePlayerCount(playerCount: number): void
{
    const playerCountSpan = document.getElementById("playerCount")!;
    playerCountSpan.textContent = playerCount.toString();
}

function startGame(playerRole: 'player1' | 'player2'): void
{
    const gameScreen = document.getElementById("gameScreen")!;
    const yourRoleSpan = document.getElementById("yourRole")!;
    
    gameScreen.classList.remove("hidden");
    yourRoleSpan.textContent = playerRole === 'player1' ? 'Joueur 1 (Gauche)' : 'Joueur 2 (Droite)';
    

    player1 = new Player("Player 1", paddleOffset);
    player2 = new Player("Player 2", canvas.width - paddleOffset - 10);
    ball = new Ball(canvas.width / 2, canvas.height / 2);
    setupGameEventListeners();

    gameRunning = true;
    gameLoop(0);
}

function returnToLobby(): void
{
    navigate('home');
}

function updatePing(): void
{
    if (Math.random() < 0.1) {
        wsClient.sendPing();
    }
    
    const pingSpan = document.getElementById("ping")!;
    pingSpan.textContent = wsClient.getPing().toString();
}

function render(): void
{
    ctx.fillStyle = COLORS.SONPI16_BLACK;
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

registerPageInitializer('game', initGame);
