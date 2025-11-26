import { Player } from "/dist/shared/models/Player.js";
import { Ball } from "/dist/shared/models/Ball.js";
import { paddleOffset } from "/dist/shared/consts.js";
import { setupGameEventListeners } from './input.js';
import * as gameState from './gameState.js';

export function startGame(playerRole: 'player1' | 'player2', gameLoop: (time: number) => void, player1Name: string, player2Name: string): void
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
    const waitingDiv = document.getElementById("waiting");
    const player1NameDiv = document.getElementById("player1Name");
    const player2NameDiv = document.getElementById("player2Name");
    
    if (!gameScreen || !player1NameDiv || !player2NameDiv) {
        console.error('[GAME] Éléments DOM manquants!');
        return;
    }
    
    if (waitingDiv)
        waitingDiv.classList.add("hidden");
    
    gameScreen.classList.remove("hidden");
    
    console.log('[GAME] Initialisation des objets du jeu...');
    gameState.setPlayer1(new Player(player1Name, paddleOffset));
    gameState.setPlayer2(new Player(player2Name, gameState.canvas.width - paddleOffset - 10));
    gameState.setBall(new Ball(gameState.canvas.width / 2, gameState.canvas.height / 2));
    gameState.setCloneBalls([]);
    gameState.setFruits([]);
    
    player1NameDiv.textContent = gameState.player1.name;
    player2NameDiv.textContent = gameState.player2.name;
    
    setupGameEventListeners();

    gameState.setGameRunning(true);
    gameState.setLastTime(0);
    
    if (gameState.animationFrameId !== null) {
        console.log('[GAME] Annulation de la boucle de rendu précédente');
        cancelAnimationFrame(gameState.animationFrameId);
        gameState.setAnimationFrameId(null);
    }
    
    console.log('[GAME] Démarrage de la boucle de rendu');
    gameState.setAnimationFrameId(requestAnimationFrame(gameLoop));
}
