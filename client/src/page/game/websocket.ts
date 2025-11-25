import { GameState } from "/dist/shared/types.js";
import { wsClient } from "../../components/WebSocketClient.js";
import { navigate } from "../../router.js";
import { renderPowerUps } from './canvas.js';
import { showGameOver, returnToLobby } from './ui.js';
import * as gameState from './gameState.js';
import { startGame } from './start.js';

export function setupWebSocketCallbacks(gameLoop: (time: number) => void): void
{
    console.log('[GAME] Configuration des callbacks WebSocket...');

    wsClient.onGameStart = (playerRole: 'player1' | 'player2') => {
        console.log('[GAME] ✅ onGameStart reçu! Role:', playerRole);
        console.log('[GAME] Canvas disponible?', !!gameState.canvas, 'ctx disponible?', !!gameState.ctx);
        gameState.setCurrentPlayerRole(playerRole);
        
        const attemptStart = () => {
            const gameScreen = document.getElementById("gameScreen");
            const yourRoleSpan = document.getElementById("yourRole");
            
            if (gameState.canvas && gameState.ctx && gameScreen && yourRoleSpan) {
                console.log('[GAME] DOM prêt, démarrage du jeu');
                startGame(playerRole, gameLoop);
            } else {
                console.log('[GAME] DOM pas encore prêt, retry dans 50ms...');
                setTimeout(attemptStart, 50);
            }
        };
        
        attemptStart();
    };
    console.log('[GAME] Callback onGameStart configuré');
    
    wsClient.onWaitingForPlayer = () => {
        const waitingDiv = document.getElementById('waiting')
        if (gameState.gameRunning)
        {
            alert('Adversaire déconnecté')
            returnToLobby()
        }
        if (waitingDiv)
            waitingDiv.classList.remove('hidden')
    }
    
    wsClient.onGameState = (serverGameState: GameState) => {
        updateGameState(serverGameState);
    };

    wsClient.onDisconnected = () => {
        // alert("Connexion perdue avec le serveur");
        returnToLobby();
    };
    
    wsClient.onError = (error: string) => {
        alert(error);
    };
    
    wsClient.onGameOver = (winner: 'player1' | 'player2', score1: number, score2: number, isTournament?: boolean, shouldDisconnect?: boolean, forfeit?: boolean) => {
        showGameOver(winner, score1, score2, isTournament, shouldDisconnect, forfeit);
    };
    
    console.log('[GAME] Tous les callbacks configurés');
}

function updateGameState(serverGameState: GameState): void
{
    if (!gameState.player1 || !gameState.player2 || !gameState.ball)
    {
        console.warn('[GAME] updateGameState appelé mais objets pas encore initialisés, retry dans 50ms')
        setTimeout(() => updateGameState(serverGameState), 50)
        return
    }

    const oldScore1 = gameState.player1.score;
    const oldScore2 = gameState.player2.score;

    gameState.player1.paddle.positionY = serverGameState.player1.paddle.y;
    gameState.player1.score = serverGameState.player1.score;
    
    gameState.player2.paddle.positionY = serverGameState.player2.paddle.y;
    gameState.player2.score = serverGameState.player2.score;
    
    gameState.ball.positionX = serverGameState.ball.x;
    gameState.ball.positionY = serverGameState.ball.y;
    gameState.ball.velocityX = serverGameState.ball.vx;
    gameState.ball.velocityY = serverGameState.ball.vy;

    gameState.setCloneBalls(serverGameState.cloneBalls || []);
    gameState.setFruits(serverGameState.fruits || []);

    if (gameState.player1.score > oldScore1) {
        console.log(`[GAME] POINT POUR PLAYER 1! Score: ${gameState.player1.score} - ${gameState.player2.score}`);
    }
    if (gameState.player2.score > oldScore2) {
        console.log(`[GAME] POINT POUR PLAYER 2! Score: ${gameState.player1.score} - ${gameState.player2.score}`);
    }

    if (wsClient.isCustomGame()) {
        if (serverGameState.player1.itemSlots) {
            renderPowerUps('player1', serverGameState.player1.itemSlots, 
                serverGameState.player1.selectedSlots, serverGameState.player1.pendingPowerUps,
                serverGameState.player1.hitStreak, serverGameState.player1.chargingPowerUp);
        }
        if (serverGameState.player2.itemSlots) {
            renderPowerUps('player2', serverGameState.player2.itemSlots,
                serverGameState.player2.selectedSlots, serverGameState.player2.pendingPowerUps,
                serverGameState.player2.hitStreak, serverGameState.player2.chargingPowerUp);
        }
    }

    if (Math.random() < 0.05) { 
        console.log('[GAME] Etat du jeu:', {
            score: `${gameState.player1.score} - ${gameState.player2.score}`,
            ball: {
                position: `(${Math.round(serverGameState.ball.x)}, ${Math.round(serverGameState.ball.y)})`,
                velocity: `(${Math.round(serverGameState.ball.vx)}, ${Math.round(serverGameState.ball.vy)})`
            },
            paddles: {
                player1: Math.round(serverGameState.player1.paddle.y),
                player2: Math.round(serverGameState.player2.paddle.y)
            },
            playerRole: gameState.currentPlayerRole
        });
    }
}


