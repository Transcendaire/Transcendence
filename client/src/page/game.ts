import { GameState, GameInput } from "@shared/types"
import { COLORS, FONTS, CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_SIZE, PADDLE_OFFSET } from '@shared/constants';
import { WebSocketClient } from '../components/WebSocketClient.js';
import { inputParserClass } from '../components/inputParser.js';
import { registerPageInitializer } from '../router.js';

let wsClient: WebSocketClient;
let currentPlayerRole: 'player1' | 'player2' | null = null;
let gameRunning = false;
let gameState: GameState | null = null;

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

function initGamePage(): void {
    console.log('[GAME] Initialisation de la page game');
    
    const canvas = document.getElementById("pong") as HTMLCanvasElement;
    if (!canvas) {
        console.error('[GAME] Canvas #pong introuvable !');
        return;
    }
    
    const ctx = canvas.getContext("2d")!;
    const inputParser = new inputParserClass();
    
    const joinButton = document.getElementById("joinGame") as HTMLButtonElement;
    const playerNameInput = document.getElementById("playerName") as HTMLInputElement;
    const cancelButton = document.getElementById("cancelWait") as HTMLButtonElement;
    
    if (!joinButton || !playerNameInput || !cancelButton) {
        console.error('[GAME] Éléments HTML manquants');
        return;
    }
    
    wsClient = new WebSocketClient();
    setupWebSocketHandlers(ctx);
    setupLobbyEventListeners(joinButton, playerNameInput, cancelButton, inputParser);
}

function setupWebSocketHandlers(ctx: CanvasRenderingContext2D): void {
    wsClient.onWaitingForPlayer = () => showWaitingScreen();
    wsClient.onPlayerJoined = (playerCount: number) => updatePlayerCount(playerCount);
    wsClient.onGameStart = (playerRole: 'player1' | 'player2') => {
        currentPlayerRole = playerRole;
        startGame(playerRole, ctx);
    };
    wsClient.onGameState = (newGameState: GameState) => updateGameState(newGameState);
    wsClient.onDisconnected = () => {
        showError("Connexion perdue avec le serveur");
        returnToLobby();
    };
    wsClient.onError = (error: string) => showError(error);
}

function setupLobbyEventListeners(
    joinButton: HTMLButtonElement,
    playerNameInput: HTMLInputElement,
    cancelButton: HTMLButtonElement,
    inputParser: inputParserClass
): void {
    const getPlayerName = () => playerNameInput.value.trim();

    joinButton.addEventListener('click', async () => {
        if (!inputParser.parsePlayerName(getPlayerName())) return;
        try {
            await wsClient.connect(`ws://${window.location.host}/game`);
            wsClient.joinGame(getPlayerName());
        } catch {
            showError("Impossible de se connecter au serveur");
        }
    });

    const joinAIButton = document.getElementById("joinAI") as HTMLButtonElement;
    if (joinAIButton) {
        joinAIButton.addEventListener('click', async () => {
            if (!inputParser.parsePlayerName(getPlayerName())) return;
            try {
                await wsClient.connect(`ws://${window.location.host}/game`);
                wsClient.joinAIGame(getPlayerName());
            } catch {
                showError("Impossible de se connecter au serveur");
            }
        });
    }

    cancelButton.addEventListener('click', () => {
        wsClient.disconnect();
        returnToLobby();
    });
}

function setupGameEventListeners(): void {
    document.addEventListener('keydown', (event) => {
        if (event.code in keys) keys[event.code as keyof typeof keys] = true;
    });
    document.addEventListener('keyup', (event) => {
        if (event.code in keys) keys[event.code as keyof typeof keys] = false;
    });
}

function gameLoop(ctx: CanvasRenderingContext2D): void {
    if (!gameRunning) return;

    sendInputToServer();
    render(ctx);
    updatePing();

    requestAnimationFrame(() => gameLoop(ctx));
}

function sendInputToServer(): void {
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

function updateGameState(newGameState: GameState): void {
    const oldState = gameState;
    gameState = newGameState;

    if (oldState) {
        if (gameState.player1.score > oldState.player1.score) {
            console.log(`[GAME] POINT POUR PLAYER 1! Score: ${gameState.player1.score} - ${gameState.player2.score}`);
        }
        if (gameState.player2.score > oldState.player2.score) {
            console.log(`[GAME] POINT POUR PLAYER 2! Score: ${gameState.player1.score} - ${gameState.player2.score}`);
        }
    }
}

function showWaitingScreen(): void {
    document.getElementById("lobby-content")!.classList.add("hidden");
    document.getElementById("waiting")!.classList.remove("hidden");
}

function updatePlayerCount(playerCount: number): void {
    const playerCountElement = document.getElementById("playerCount");
    if (playerCountElement) {
        playerCountElement.textContent = playerCount.toString();
    }
}

function startGame(playerRole: 'player1' | 'player2', ctx: CanvasRenderingContext2D): void {
    const lobbyScreen = document.getElementById("lobby")!;
    const gameScreen = document.getElementById("gameScreen")!;
    const yourRoleSpan = document.getElementById("yourRole")!;

    lobbyScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    yourRoleSpan.textContent = playerRole === 'player1' ? 'Joueur 1 (Gauche)' : 'Joueur 2 (Droite)';

    setupGameEventListeners();
    gameRunning = true;
    gameLoop(ctx);
}

function returnToLobby(): void {
    const lobbyScreen = document.getElementById("lobby")!;
    const gameScreen = document.getElementById("gameScreen")!;
    const lobbyContent = document.getElementById("lobby-content")!;
    const waitingDiv = document.getElementById("waiting")!;

    gameRunning = false;
    currentPlayerRole = null;
    gameState = null;

    gameScreen.classList.add("hidden");
    lobbyScreen.classList.remove("hidden");
    waitingDiv.classList.add("hidden");
    lobbyContent.classList.remove("hidden");
}

function showError(message: string): void {
    alert(message);
}

function updatePing(): void {
    if (Math.random() < 0.1) wsClient.sendPing();
    const pingElement = document.getElementById("ping");
    if (pingElement) {
        pingElement.textContent = wsClient.getPing().toString();
    }
}

function render(ctx: CanvasRenderingContext2D): void {
    if (!gameState) return;

    const canvas = ctx.canvas;
    ctx.fillStyle = COLORS.SONPI16_BLACK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw player 1 paddle
    ctx.fillStyle = COLORS.SONPI16_ORANGE;
    ctx.fillRect(PADDLE_OFFSET, gameState.player1.paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw player 2 paddle
    ctx.fillRect(CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH, gameState.player2.paddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball
    ctx.fillRect(gameState.ball.x - BALL_SIZE / 2, gameState.ball.y - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);

    // Draw score
    ctx.font = `bold 48px ${FONTS.QUENCY_PIXEL}`;
    ctx.textAlign = "center";
    ctx.fillText(`${gameState.player1.score} - ${gameState.player2.score}`, CANVAS_WIDTH / 2, 60);
}

registerPageInitializer('game', initGamePage);