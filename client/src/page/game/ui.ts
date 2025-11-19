import { wsClient } from "../../components/WebSocketClient.js";
import { navigate } from "../../router.js";
import { COLORS, FONTS } from "../../components/consts.js";
import * as gameState from './gameState.js';

export function setupDisconnectionHandlers(): void
{
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (gameState.gameRunning || wsClient.isConnected()) {
            wsClient.disconnect();
            console.log('[GAME] Déconnexion lors de la fermeture de la page');
        }
    };

    const handleVisibilityChange = () => {
        if (document.hidden && gameState.gameRunning) {
            console.log('[GAME] Page cachée pendant une partie, déconnexion...');
            wsClient.disconnect();
            gameState.setGameRunning(false);
        }
    };

    const handleSurrender = () => {
        if (confirm('Voulez-vous vraiment abandonner la partie ?')) {
            console.log('[GAME] Abandon de la partie');
            if (wsClient.isConnected())
                wsClient.surrender()
            returnToLobby()
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const surrenderButton = document.getElementById('surrenderButton');
    if (surrenderButton)
        surrenderButton.addEventListener('click', handleSurrender);

    gameState.addCleanupHandler(() => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (surrenderButton)
            surrenderButton.removeEventListener('click', handleSurrender);
    });
}

export function showGameOver(winner: 'player1' | 'player2', score1: number, score2: number): void
{
    gameState.setGameRunning(false);
    const isWinner = winner === gameState.currentPlayerRole;
    const message = isWinner ? 'Vous avez gagné !' : 'Vous avez perdu !';
    const scoreText = `Score final : ${score1} - ${score2}`;
    
    gameState.ctx.save();
    gameState.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);
    
    gameState.ctx.fillStyle = isWinner ? COLORS.SONPI16_ORANGE : '#ff0000';
    gameState.ctx.font = '48px ' + FONTS.QUENCY_PIXEL;
    gameState.ctx.textAlign = 'center';
    gameState.ctx.textBaseline = 'middle';
    gameState.ctx.fillText(message, gameState.canvas.width / 2, gameState.canvas.height / 2 - 40);
    
    gameState.ctx.fillStyle = COLORS.SONPI16_ORANGE;
    gameState.ctx.font = '32px ' + FONTS.QUENCY_PIXEL;
    gameState.ctx.fillText(scoreText, gameState.canvas.width / 2, gameState.canvas.height / 2 + 20);
    
    gameState.ctx.font = '24px ' + FONTS.QUENCY_PIXEL;
    gameState.ctx.fillText('Retour au lobby dans 3 secondes...', gameState.canvas.width / 2, gameState.canvas.height / 2 + 80);
    gameState.ctx.restore();
    
    setTimeout(() => {
        returnToLobby();
    }, 3000);
}

export function returnToLobby(): void
{
    if (gameState.isReturningToLobby) {
        console.log('[GAME] Retour au lobby déjà en cours, ignoré');
        return;
    }
    
    console.log('[GAME] Retour au lobby, déconnexion WebSocket...');
    gameState.setIsReturningToLobby(true);
    gameState.setGameRunning(false);
    gameState.setCurrentPlayerRole(null);
    gameState.setCloneBalls([]);
    gameState.setFruits([]);
    
    if (gameState.animationFrameId !== null) {
        cancelAnimationFrame(gameState.animationFrameId);
        gameState.setAnimationFrameId(null);
    }
    
    wsClient.disconnect();
    gameState.clearCleanupHandlers();
    navigate('home');
    
    setTimeout(() => {
        gameState.setIsReturningToLobby(false);
    }, 1000);
}

export function updatePing(): void
{
    if (Math.random() < 0.1) {
        wsClient.sendPing();
    }
    
    const pingSpan = document.getElementById("ping")!;
    pingSpan.textContent = wsClient.getPing().toString();
}
