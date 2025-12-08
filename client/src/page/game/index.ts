import { Player } from "@shared/models/Player";
import { Ball } from "@shared/models/Ball";
import { wsClient } from "../../components/WebSocketClient";
import { inputParserClass } from "../../components/inputParser"
import { paddleSize, paddleOffset} from "@shared/consts";
import { registerPageInitializer , navigate } from "../../router";
import { setNavigationLock } from "../../app";
import * as gameState from './gameState';
import { setupGameEventListeners, sendInputToServer } from './input';
import { render } from './canvas';
import { setupDisconnectionHandlers, updatePing } from './ui';
import { setupWebSocketCallbacks } from './websocket';
import { startGame } from './start';

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
    
    setNavigationLock(true)
    cleanupPreviousHandlers();
    document.body.classList.remove('bg-sonpi16-orange');
    document.body.classList.add('bg-sonpi16-black');
    gameState.addCleanupHandler(() => {
        document.body.classList.remove('bg-sonpi16-black');
        document.body.classList.add('bg-sonpi16-orange');
    });

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
        const storedOpponent = sessionStorage.getItem('tournamentOpponent');
        
        if (storedRole) {
            gameState.setCurrentPlayerRole(storedRole);
            console.log('[GAME] Rôle stocké:', storedRole, '- En attente du premier gameState du serveur...');
            sessionStorage.removeItem('playerRole');
        }
        else
        {
            setNavigationLock(false)
            window.history.replaceState({ route: 'home', path: '/home' }, '', '/home')
            import('../../router').then(({ render }) => {
                render('home');
            });
        }

        if (storedOpponent) {
            console.log('[GAME] Opponent stocké:', storedOpponent, '- Affichage du countdown');
            gameState.setTournamentCountdown({ opponentName: storedOpponent, countdown: 3 });
            gameState.setGameRunning(true);
            sessionStorage.removeItem('tournamentOpponent');
            gameState.setAnimationFrameId(requestAnimationFrame(gameLoop));
        }

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
