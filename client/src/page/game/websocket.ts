import type { GameState } from "@shared/types";
import { wsClient } from "../../components/WebSocketClient";
import { navigate } from "../../router";
import { renderPowerUps, renderHearts } from './canvas';
import { showGameOver, returnToLobby } from './ui';
import * as gameState from './gameState';
import { startGame, startBattleRoyaleGame } from './start';

let savedGameLoop: ((time: number) => void) | null = null;


export function setupWebSocketCallbacks(gameLoop: (time: number) => void): void
{
    console.log('[GAME] Configuration des callbacks WebSocket...');
    savedGameLoop = gameLoop;
    
    gameState.setIsBattleRoyale(false);
    gameState.setPolygonData(null);
    gameState.setAllPlayers([]);

    wsClient.onGameStart = (playerRole: 'player1' | 'player2', player1Name?: string, player2Name?: string) => {
        console.log('[GAME] ✅ onGameStart reçu! Role:', playerRole);
        console.log('[GAME] Canvas disponible?', !!gameState.canvas, 'ctx disponible?', !!gameState.ctx);
        gameState.setCurrentPlayerRole(playerRole);
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
    
    wsClient.onGameOver = (winner: 'player1' | 'player2', lives1: number, lives2: number, isTournament?: boolean, shouldDisconnect?: boolean, forfeit?: boolean) => {
        showGameOver(winner, lives1, lives2, isTournament, shouldDisconnect, forfeit);
    };
    
    console.log('[GAME] Tous les callbacks configurés');
}

function updateGameState(serverGameState: GameState): void
{
	if (serverGameState.isBattleRoyale)
	{
		updateBattleRoyaleState(serverGameState);
		return;
	}
	updateClassicGameState(serverGameState);
}

/**
 * @brief Update state for Battle Royale polygon mode
 */
function updateBattleRoyaleState(serverGameState: GameState): void
{
	if (!gameState.isBattleRoyale && serverGameState.polygonData)
	{
		if (!gameState.currentPlayerRole || !savedGameLoop)
			return;

		const playerNames = serverGameState.players.map((p, i) => p.name || `Player ${i + 1}`);
		const myIndex = parseInt(gameState.currentPlayerRole.replace('player', '')) - 1;

		startBattleRoyaleGame(
			myIndex,
			savedGameLoop,
			playerNames,
			serverGameState.polygonData
		);
		setTimeout(() => updateBattleRoyaleState(serverGameState), 50);
		return;
	}

	if (!gameState.isBattleRoyale && !serverGameState.polygonData)
	{
		if (!gameState.currentPlayerRole || !savedGameLoop)
			return;
		if (!gameState.player1 || !gameState.player2)
		{
			const p1 = serverGameState.players[0];
			const p2 = serverGameState.players[1];
			if (!p1?.name || !p2?.name)
				return;
			const myIndex = parseInt(gameState.currentPlayerRole.replace('player', '')) - 1;
			gameState.setPlayerIndex(myIndex);
			startGame(
				gameState.currentPlayerRole,
				savedGameLoop,
				p1.name,
				p2.name
			);
			gameState.setIsBattleRoyale(true);
			setTimeout(() => updateBattleRoyaleState(serverGameState), 50);
			return;
		}
	}

	if (gameState.isBattleRoyale && !serverGameState.polygonData)
		gameState.setPolygonData(null);
	gameState.setAllPlayers(serverGameState.players);
	gameState.setPolygonData(serverGameState.polygonData ?? null);
	if (gameState.ball && serverGameState.ball)
	{
		gameState.ball.positionX = serverGameState.ball.x;
		gameState.ball.positionY = serverGameState.ball.y;
		gameState.ball.velocityX = serverGameState.ball.vx;
		gameState.ball.velocityY = serverGameState.ball.vy;
	}
	gameState.setCloneBalls(serverGameState.cloneBalls || []);
	gameState.setFruits(serverGameState.fruits || []);
}

/**
 * @brief Update state for classic 2-player rectangle mode
 */
function updateClassicGameState(serverGameState: GameState): void
{
    if (!gameState.player1 || !gameState.player2 || !gameState.ball)
    {
        if (!gameState.currentPlayerRole || !savedGameLoop) {
            console.warn('[GAME] updateGameState mais pas de rôle ou gameLoop défini, ignoré');
            return;
        }
        const p1 = serverGameState.players[0];
        const p2 = serverGameState.players[1];
        if (!p1 || !p2) return;
        
        const player1Name = p1.name || 'Player 1';
        const player2Name = p2.name || 'Player 2';
        
        console.log('[GAME] Premier gameState reçu, initialisation avec noms:', player1Name, 'vs', player2Name);
        
        startGame(gameState.currentPlayerRole, savedGameLoop, player1Name, player2Name);
        
        setTimeout(() => updateGameState(serverGameState), 50);
        return;
    }

    const p1 = serverGameState.players[0]
    const p2 = serverGameState.players[1]
    if (!p1 || !p2)
        return

    const oldScore1 = gameState.player1.lives;
    const oldScore2 = gameState.player2.lives;

    gameState.player1.paddle.positionY = p1.paddle.y;
    gameState.player1.lives = p1.lives;
    
    gameState.player2.paddle.positionY = p2.paddle.y;
    gameState.player2.lives = p2.lives;
    
    gameState.ball.positionX = serverGameState.ball.x;
    gameState.ball.positionY = serverGameState.ball.y;
    gameState.ball.velocityX = serverGameState.ball.vx;
    gameState.ball.velocityY = serverGameState.ball.vy;

    gameState.setCloneBalls(serverGameState.cloneBalls || []);
    gameState.setFruits(serverGameState.fruits || []);

    renderHearts('player1', gameState.player1.lives);
    renderHearts('player2', gameState.player2.lives);
    
    const player1PingSpan = document.getElementById("player1Ping");
    const player2PingSpan = document.getElementById("player2Ping");
    if (player1PingSpan)
        player1PingSpan.textContent = `${p1.ping ?? 0}ms`;
    if (player2PingSpan)
        player2PingSpan.textContent = `${p2.ping ?? 0}ms`;

    if (gameState.player1.lives > oldScore1)
        console.log(`[GAME] POINT POUR PLAYER 1! Score: ${gameState.player1.lives} - ${gameState.player2.lives}`);
    if (gameState.player2.lives > oldScore2)
        console.log(`[GAME] POINT POUR PLAYER 2! Score: ${gameState.player1.lives} - ${gameState.player2.lives}`);

    if (wsClient.isCustomGame())
    {
        if (p1.itemSlots)
            renderPowerUps('player1', p1.itemSlots, p1.selectedSlots, p1.pendingPowerUps, p1.hitStreak, p1.chargingPowerUp);
        if (p2.itemSlots)
            renderPowerUps('player2', p2.itemSlots, p2.selectedSlots, p2.pendingPowerUps, p2.hitStreak, p2.chargingPowerUp);
    }

    if (Math.random() < 0.05)
    { 
        console.log('[GAME] Etat du jeu:', {
            lives: `${gameState.player1.lives} - ${gameState.player2.lives}`,
            ball: {
                position: `(${Math.round(serverGameState.ball.x)}, ${Math.round(serverGameState.ball.y)})`,
                velocity: `(${Math.round(serverGameState.ball.vx)}, ${Math.round(serverGameState.ball.vy)})`
            },
            paddles: {
                player1: Math.round(p1.paddle.y),
                player2: Math.round(p2.paddle.y)
            },
            playerRole: gameState.currentPlayerRole
        });
    }
}


