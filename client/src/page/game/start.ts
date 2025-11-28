import { Player } from "@shared/models/Player";
import { Ball } from "@shared/models/Ball";
import { paddleOffset } from "@shared/consts";
import { setupGameEventListeners } from './input';
import * as gameState from './gameState';

export function startGame(playerRole: 'player1' | 'player2', gameLoop: (time: number) => void): void
{
    console.log('[GAME] ========== startGame() appelé ==========');
    console.log('[GAME] Role:', playerRole);
    console.log('[GAME] Canvas disponible?', !!gameState.canvas, 'Dimensions:', gameState.canvas?.width, 'x', gameState.canvas?.height);
    console.log('[GAME] ctx disponible?', !!gameState.ctx);
    
    if (!gameState.canvas || !gameState.ctx) {
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
    gameState.setPlayer1(new Player("Player 1", paddleOffset));
    gameState.setPlayer2(new Player("Player 2", gameState.canvas.width - paddleOffset - 10));
    gameState.setBall(new Ball(gameState.canvas.width / 2, gameState.canvas.height / 2));
    gameState.setCloneBalls([]);
    gameState.setFruits([]);
    setupGameEventListeners();

    gameState.setGameRunning(true);
    gameState.setLastTime(0);
    
    if (gameState.animationFrameId === null) {
        console.log('[GAME] Démarrage de la boucle de rendu');
        gameState.setAnimationFrameId(requestAnimationFrame(gameLoop));
    } else {
        console.log('[GAME] Boucle de rendu déjà active');
    }
}
