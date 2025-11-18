import { Player } from "/dist/shared/models/Player.js";
import { Ball } from "/dist/shared/models/Ball.js";
import { wsClient } from "../components/WebSocketClient.js";
import { GameState, GameInput, PowerUpFruit } from "/dist/shared/types.js";
import { inputParserClass } from "../components/inputParser.js"
import { paddleSize, paddleOffset} from "/dist/shared/consts.js";
import { COLORS, FONTS } from "../components/consts.js";
import { registerPageInitializer , navigate } from "../router.js";

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
const inputParser = new inputParserClass();

let lastTime = 0;
let player1: Player;
let player2: Player;
let ball: Ball;
let cloneBalls: Array<{ x: number; y: number; vx: number; vy: number }> = [];
let fruits: PowerUpFruit[] = [];
let currentPlayerRole: 'player1' | 'player2' | null = null;
let gameRunning = false;
let cleanupHandlers: (() => void)[] = [];
let animationFrameId: number | null = null;
let isReturningToLobby = false;

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
    ArrowRight: false,
    Digit1: false,
    Digit2: false,
    Digit3: false
};

/**
 * @brief init the game logic, his events and websocket
 */
function initGame(): void
{
    console.log('[GAME] ========== initGame() appelé ==========');
    console.log('[GAME] État actuel - gameRunning:', gameRunning, 'currentPlayerRole:', currentPlayerRole);
    console.log('[GAME] WebSocket connecté?', wsClient.isConnected());
    
    cleanupPreviousHandlers();
    
    requestAnimationFrame(() => {
        canvas = document.getElementById("pong") as HTMLCanvasElement;
        if (!canvas) {
            console.error('[GAME] Canvas #pong non trouvé!');
            return;
        }
        console.log('[GAME] Canvas trouvé, dimensions:', canvas.width, 'x', canvas.height);
        ctx = canvas.getContext("2d")!;
        
        setupWebSocketCallbacks();
        setupDisconnectionHandlers();
        console.log('[GAME] Initialisation terminée');
        console.log('[GAME] Callbacks WebSocket configurés');
        
        if (wsClient.isConnected()) {
            console.log('[GAME] ⚠️ WebSocket déjà connecté depuis une session précédente');
        }
    });
}

/**
 * @brief Setup WebSocket callbacks
 */
function setupWebSocketCallbacks(): void
{
    console.log('[GAME] Configuration des callbacks WebSocket...');

    wsClient.onWaitingForPlayer = () => {
        showWaitingScreen();
    };
    wsClient.onPlayerJoined = (playerCount: number) => {
        updatePlayerCount(playerCount);
    };
    wsClient.onGameStart = (playerRole: 'player1' | 'player2') => {
        console.log('[GAME] ✅ onGameStart reçu! Role:', playerRole);
        console.log('[GAME] Canvas disponible?', !!canvas, 'ctx disponible?', !!ctx);
        currentPlayerRole = playerRole;
        
        const attemptStart = () => {
            const gameScreen = document.getElementById("gameScreen");
            const yourRoleSpan = document.getElementById("yourRole");
            
            if (canvas && ctx && gameScreen && yourRoleSpan) {
                console.log('[GAME] DOM prêt, démarrage du jeu');
                startGame(playerRole);
            } else {
                console.log('[GAME] DOM pas encore prêt, retry dans 50ms...');
                setTimeout(attemptStart, 50);
            }
        };
        
        attemptStart();
    };
    console.log('[GAME] Callback onGameStart configuré');
    
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
    wsClient.onGameOver = (winner: 'player1' | 'player2', score1: number, score2: number) => {
        showGameOver(winner, score1, score2);
    };
    console.log('[GAME] Tous les callbacks configurés');
}

/**
 * @brief Setup keyboard event listeners for game controls
 */
function setupGameEventListeners(): void
{
    window.addEventListener('keydown', (e) => {
        keys[e.code as keyof typeof keys] = true;
    });
    window.addEventListener('keyup', (e) => {
        keys[e.code as keyof typeof keys] = false;
    });
}

/**
 * @brief Setup disconnection handlers for page unload and visibility changes
 */
function setupDisconnectionHandlers(): void
{
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (gameRunning || wsClient.isConnected()) {
            wsClient.disconnect();
            console.log('[GAME] Déconnexion lors de la fermeture de la page');
        }
    };

    const handleVisibilityChange = () => {
        if (document.hidden && gameRunning) {
            console.log('[GAME] Page cachée pendant une partie, déconnexion...');
            wsClient.disconnect();
            gameRunning = false;
        }
    };

    const handleSurrender = () => {
        if (confirm('Voulez-vous vraiment abandonner la partie ?')) {
            console.log('[GAME] Abandon de la partie');
            returnToLobby();
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const surrenderButton = document.getElementById('surrenderButton');
    if (surrenderButton)
        surrenderButton.addEventListener('click', handleSurrender);

    cleanupHandlers.push(() => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (surrenderButton)
            surrenderButton.removeEventListener('click', handleSurrender);
    });
}

/**
 * @brief Cleanup previous event handlers to prevent memory leaks
 */
function cleanupPreviousHandlers(): void
{
    for (const cleanup of cleanupHandlers)
        cleanup();
    cleanupHandlers = [];
}

/**
 * @brief Main game loop
 * @param currentTime Current timestamp
 */
function gameLoop(currentTime: number): void
{
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    if (gameRunning) {
        sendInputToServer();
        render();
        updatePing();
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
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

    if (wsClient.isCustomGame()) {
        input.keys.slot1 = keys.Digit1;
        input.keys.slot2 = keys.Digit2;
        input.keys.slot3 = keys.Digit3;
    }

    wsClient.sendInput(input);
}

function updateGameState(gameState: GameState): void
{
    if (!player1 || !player2 || !ball) {
        console.warn('[GAME] updateGameState appelé mais objets pas encore initialisés');
        return;
    }

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

    cloneBalls = gameState.cloneBalls || [];
    fruits = gameState.fruits || [];

    if (player1.score > oldScore1) {
        console.log(`[GAME] POINT POUR PLAYER 1! Score: ${player1.score} - ${player2.score}`);
    }
    if (player2.score > oldScore2) {
        console.log(`[GAME] POINT POUR PLAYER 2! Score: ${player1.score} - ${player2.score}`);
    }

    if (wsClient.isCustomGame()) {
        if (gameState.player1.itemSlots) {
            renderPowerUps('player1', gameState.player1.itemSlots, 
                gameState.player1.selectedSlots, gameState.player1.pendingPowerUps,
                gameState.player1.hitStreak, gameState.player1.chargingPowerUp);
        }
        if (gameState.player2.itemSlots) {
            renderPowerUps('player2', gameState.player2.itemSlots,
                gameState.player2.selectedSlots, gameState.player2.pendingPowerUps,
                gameState.player2.hitStreak, gameState.player2.chargingPowerUp);
        }
    }

    if (Math.random() < 0.05) { 
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

function showGameOver(winner: 'player1' | 'player2', score1: number, score2: number): void
{
    gameRunning = false;
    const isWinner = winner === currentPlayerRole;
    const message = isWinner ? 'Vous avez gagné !' : 'Vous avez perdu !';
    const scoreText = `Score final : ${score1} - ${score2}`;
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = isWinner ? COLORS.SONPI16_ORANGE : '#ff0000';
    ctx.font = '48px ' + FONTS.QUENCY_PIXEL;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 40);
    
    ctx.fillStyle = COLORS.SONPI16_ORANGE;
    ctx.font = '32px ' + FONTS.QUENCY_PIXEL;
    ctx.fillText(scoreText, canvas.width / 2, canvas.height / 2 + 20);
    
    ctx.font = '24px ' + FONTS.QUENCY_PIXEL;
    ctx.fillText('Retour au lobby dans 3 secondes...', canvas.width / 2, canvas.height / 2 + 80);
    ctx.restore();
    
    setTimeout(() => {
        returnToLobby();
    }, 3000);
}

function startGame(playerRole: 'player1' | 'player2'): void
{
    console.log('[GAME] ========== startGame() appelé ==========');
    console.log('[GAME] Role:', playerRole);
    console.log('[GAME] Canvas disponible?', !!canvas, 'Dimensions:', canvas?.width, 'x', canvas?.height);
    console.log('[GAME] ctx disponible?', !!ctx);
    
    if (!canvas || !ctx) {
        console.error('[GAME] Canvas ou contexte non disponible!');
        return;
    }
    
    const gameScreen = document.getElementById("gameScreen");
    const yourRoleSpan = document.getElementById("yourRole");
    const waitingDiv = document.getElementById("waiting");
    
    if (!gameScreen || !yourRoleSpan) {
        console.error('[GAME] Éléments DOM manquants!');
        return;
    }
    
    if (waitingDiv)
        waitingDiv.classList.add("hidden");
    
    gameScreen.classList.remove("hidden");
    yourRoleSpan.textContent = playerRole === 'player1' ? 'Joueur 1 (Gauche)' : 'Joueur 2 (Droite)';
    
    console.log('[GAME] Initialisation des objets du jeu...');
    player1 = new Player("Player 1", paddleOffset);
    player2 = new Player("Player 2", canvas.width - paddleOffset - 10);
    ball = new Ball(canvas.width / 2, canvas.height / 2);
    cloneBalls = [];
    fruits = [];
    setupGameEventListeners();

    gameRunning = true;
    lastTime = 0;
    
    if (animationFrameId === null) {
        console.log('[GAME] Démarrage de la boucle de rendu');
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
        console.log('[GAME] Boucle de rendu déjà active');
    }
}

function returnToLobby(): void
{
    if (isReturningToLobby) {
        console.log('[GAME] Retour au lobby déjà en cours, ignoré');
        return;
    }
    
    console.log('[GAME] Retour au lobby, déconnexion WebSocket...');
    isReturningToLobby = true;
    gameRunning = false;
    currentPlayerRole = null;
    cloneBalls = [];
    fruits = [];
    
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    
    wsClient.disconnect();
    cleanupPreviousHandlers();
    navigate('home');
    
    setTimeout(() => {
        isReturningToLobby = false;
    }, 1000);
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
    if (!ctx || !canvas) return;
    
    ctx.fillStyle = COLORS.SONPI16_BLACK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!player1 || !player2 || !ball) {
        console.warn('[GAME] render() appelé mais objets pas encore initialisés');
        return;
    }

    player1.paddle.render(ctx, COLORS.SONPI16_ORANGE);
    player2.paddle.render(ctx, COLORS.SONPI16_ORANGE);

    fruits.forEach(fruit => {
        renderFruit(fruit);
    });

    cloneBalls.forEach(clone => {
        renderCloneBall(clone);
    });

    ball.render(ctx, COLORS.SONPI16_ORANGE);

    renderScore();
}

function renderFruit(fruit: PowerUpFruit): void
{
    const size = 30;
    const centerX = fruit.x + size / 2;
    const centerY = fruit.y + size / 2;
    const time = Date.now() / 1000;
    const rotation = (time * 0.5) % (Math.PI * 2);

    ctx.save();
    ctx.fillStyle = COLORS.SONPI16_ORANGE;
    ctx.font = `bold 32px ${FONTS.QUENCY_PIXEL}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.fillText("R", 0, 0);
    ctx.restore();
}

function renderCloneBall(clone: { x: number; y: number; vx: number; vy: number }): void
{
    const size = 12;
    const centerX = clone.x + size / 2;
    const centerY = clone.y + size / 2;

    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = COLORS.SONPI16_ORANGE;
    ctx.translate(centerX, centerY);
    ctx.translate(-size / 2, -size / 2);
    ctx.fillRect(3, 0, 6, 3);
    ctx.fillRect(0, 3, 12, 3);
    ctx.fillRect(0, 6, 12, 3);
    ctx.fillRect(3, 9, 6, 3);
    ctx.restore();
}

function renderScore(): void
{
    ctx.fillStyle = COLORS.SONPI16_ORANGE;
    ctx.font = `bold 48px ${FONTS.QUENCY_PIXEL}`;
    ctx.textAlign = "center";
    ctx.fillText(`${player1.score} - ${player2.score}`, canvas.width / 2, 60);
}

/**
 * @brief Render power-up slots for a player
 * @param player Player identifier
 * @param itemSlots Array of power-ups in slots
 * @param selectedSlots Array indicating which slots are selected
 * @param pendingPowerUps Array of power-ups pending activation
 * @param hitStreak Current hit streak (0-3)
 * @param chargingPowerUp Power-up currently charging
 */
function renderPowerUps(player: 'player1' | 'player2',
    itemSlots: (string | null)[],
    selectedSlots?: boolean[],
    pendingPowerUps?: (string | null)[],
    hitStreak?: number,
    chargingPowerUp?: string | null): void
{
    const container = document.getElementById(
        `powerUpsPlayer${player === 'player1' ? '1' : '2'}`
    );
    const slotImages: string[] = [
        './assets/images/son-256x.png',
        './assets/images/pi-256x.png',
        './assets/images/16-256x.png'
    ];
    const powerUpNames = ['Son', 'Pi', '16'];

    if (!container)
        return;
    
    container.innerHTML = '';
    
    for (let index = 0; index < 3; index++) {
        const slotDiv = document.createElement('div');
        const isSelected = selectedSlots?.[index] || false;
        const hasItem = itemSlots[index] !== null;
        const isCharging = chargingPowerUp === powerUpNames[index];
        const chargingLevel = isCharging ? (hitStreak || 0) : 0;

        slotDiv.className = `w-12 h-12 border-2 bg-sonpi16-black rounded flex items-center justify-center`;
        
        if (isSelected) {
            slotDiv.style.borderColor = COLORS.SONPI16_ORANGE;
            slotDiv.style.borderWidth = '3px';
        } else {
            slotDiv.style.borderColor = COLORS.SONPI16_ORANGE;
        }

        const imgContainer = document.createElement('div');
        imgContainer.className = 'w-10 h-10 relative';

        const img = document.createElement('img');
        img.src = slotImages[index]!;
        img.className = 'w-10 h-10 absolute top-0 left-0';
        img.alt = `Slot ${index + 1}`;
        
        if (!hasItem && !isCharging) {
            img.style.filter = 'grayscale(100%) brightness(0.5)';
        } else if (isCharging && chargingLevel < 3) {
            const fillPercentage = (chargingLevel / 3) * 100;
            img.style.clipPath = `inset(${100 - fillPercentage}% 0 0 0)`;
            
            const grayImg = document.createElement('img');
            grayImg.src = slotImages[index]!;
            grayImg.className = 'w-10 h-10 absolute top-0 left-0';
            grayImg.style.filter = 'grayscale(100%) brightness(0.5)';
            grayImg.style.clipPath = `inset(0 0 ${fillPercentage}% 0)`;
            
            imgContainer.appendChild(grayImg);
        }
        
        imgContainer.appendChild(img);
        slotDiv.appendChild(imgContainer);
        container.appendChild(slotDiv);
    }

    if (pendingPowerUps && pendingPowerUps.length > 0) {
        const pendingContainer = document.createElement('div');
        pendingContainer.className = 'mt-2 text-xs';
        pendingContainer.style.color = COLORS.SONPI16_ORANGE;
        pendingContainer.style.fontFamily = FONTS.QUENCY_PIXEL;
        pendingContainer.textContent = `Pending: ${pendingPowerUps.filter(p => p !== null).length}`;
        container.appendChild(pendingContainer);
    }
}

registerPageInitializer('game', initGame);
