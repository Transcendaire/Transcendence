import { Player } from "@shared/models/Player";
import { Ball } from "@shared/models/Ball";
import { PolygonData } from "@shared/types";
import { paddleOffset } from "@shared/consts";
import { setupGameEventListeners } from './input';
import * as gameState from './gameState';

/**
 * @brief Start classic 2-player game
 */
export function startGame(
	playerRole: 'player1' | 'player2',
	gameLoop: (time: number) => void,
	player1Name: string,
	player2Name: string
): void
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
	gameState.setIsBattleRoyale(false);
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

/**
 * @brief Start Battle Royale polygon game with N players
 */
export function startBattleRoyaleGame(
	playerIndex: number,
	gameLoop: (time: number) => void,
	playerNames: string[],
	polygonData: PolygonData
): void
{
	console.log('[GAME] ========== startBattleRoyaleGame() ==========');
	console.log('[GAME] Player index:', playerIndex, 'Total players:', playerNames.length);

	if (!gameState.canvas || !gameState.ctx)
	{
		console.error('[GAME] Canvas ou contexte non disponible!');
		return;
	}

	const gameScreen = document.getElementById("gameScreen");
	const waitingDiv = document.getElementById("waiting");
	const player1NameDiv = document.getElementById("player1Name");
	const player2NameDiv = document.getElementById("player2Name");

	if (!gameScreen)
	{
		console.error('[GAME] Éléments DOM manquants!');
		return;
	}

	if (waitingDiv)
		waitingDiv.classList.add("hidden");

	gameScreen.classList.remove("hidden");

	if (player1NameDiv) player1NameDiv.textContent = '';
	if (player2NameDiv) player2NameDiv.textContent = '';

	const heartsP1 = document.getElementById('heartsPlayer1');
	const heartsP2 = document.getElementById('heartsPlayer2');
	const powerUpsP1 = document.getElementById('powerUpsPlayer1');
	const powerUpsP2 = document.getElementById('powerUpsPlayer2');
	if (heartsP1) heartsP1.innerHTML = '';
	if (heartsP2) heartsP2.innerHTML = '';
	if (powerUpsP1) powerUpsP1.innerHTML = '';
	if (powerUpsP2) powerUpsP2.innerHTML = '';

	gameState.setIsBattleRoyale(true);
	gameState.setPolygonData(polygonData);
	gameState.setPlayerIndex(playerIndex);
	gameState.setBall(new Ball(polygonData.center.x, polygonData.center.y));
	gameState.setCloneBalls([]);
	gameState.setFruits([]);

	setupGameEventListeners();
	gameState.setGameRunning(true);
	gameState.setLastTime(0);

	if (gameState.animationFrameId !== null)
	{
		cancelAnimationFrame(gameState.animationFrameId);
		gameState.setAnimationFrameId(null);
	}

	console.log('[GAME] Démarrage de la boucle Battle Royale');
	gameState.setAnimationFrameId(requestAnimationFrame(gameLoop));
}
