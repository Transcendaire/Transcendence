import { Player } from "/dist/shared/models/Player.js";
import { Ball } from "/dist/shared/models/Ball.js";
import { wsClient } from "../../components/WebSocketClient.js";
import { inputParserClass } from "../../components/inputParser.js"
import { paddleSize, paddleOffset} from "/dist/shared/consts.js";
import { registerPageInitializer , navigate } from "../../router.js";
import * as gameState from './gameState.js';
import { setupGameEventListeners, sendInputToServer } from './input.js';
import { render } from './canvas.js';
import { setupDisconnectionHandlers, updatePing } from './ui.js';
import { setupWebSocketCallbacks } from './websocket.js';
import { startGame } from './start.js';

const inputParser = new inputParserClass();

/**
 * @brief init the game logic, his events and websocket
 */
function initGame(): void
{
    console.log('[GAME] initGame() appelé');

    console.log('[GAME] ========== initGame() appelé ==========');
    console.log('[GAME] État actuel - gameRunning:', gameState.gameRunning, 'currentPlayerRole:', gameState.currentPlayerRole);
    console.log('[GAME] WebSocket connecté?', wsClient.isConnected());
    
    cleanupPreviousHandlers();
    setupDisconnectionHandlers();
    
    requestAnimationFrame(() => {
        const canvas = document.getElementById("pong") as HTMLCanvasElement;
        if (!canvas) {
            console.error('[GAME] Canvas #pong non trouvé!');
            return;
        }
        console.log('[GAME] Canvas trouvé, dimensions:', canvas.width, 'x', canvas.height);
        gameState.setCanvas(canvas);
        const ctx = canvas.getContext("2d")!;
        gameState.setCtx(ctx);
        
        const storedRole = sessionStorage.getItem('playerRole') as 'player1' | 'player2' | null;
        if (storedRole) {
            gameState.setCurrentPlayerRole(storedRole);
            console.log('[GAME] Démarrage avec rôle:', storedRole);
            sessionStorage.removeItem('playerRole');
            console.log('[GAME] Lancement local du jeu avec storedRole');
            startGame(storedRole, gameLoop);
        }
        else
            navigate("home");

        console.log('[GAME] Initialisation terminée - Canvas et DOM prêts');
        setupWebSocketCallbacks(gameLoop);
        console.log('[GAME] Callbacks WebSocket configurés');
        
        if (wsClient.isConnected()) {
            console.log('[GAME] ⚠️ WebSocket déjà connecté depuis une session précédente');
        }
    });
}

/**
 * @brief Cleanup previous event handlers to prevent memory leaks
 */
function cleanupPreviousHandlers(): void
{
    gameState.clearCleanupHandlers();
}

/**
 * @brief Main game loop
 * @param currentTime Current timestamp
 */
function gameLoop(currentTime: number): void
{
    const deltaTime = currentTime - gameState.lastTime;
    gameState.setLastTime(currentTime);
    
    if (gameState.gameRunning) {
        sendInputToServer();
        render();
        updatePing();
    }
    gameState.setAnimationFrameId(requestAnimationFrame(gameLoop));
}

registerPageInitializer('game', initGame);
