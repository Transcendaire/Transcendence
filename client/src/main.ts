// import { Player } from "./Player.js";
// import { Ball } from "./Ball.js";
// import { COLORS, FONTS } from "./constants.js";
// import { WebSocketClient } from "./WebSocketClient.js";
// import { GameState, GameInput, TournamentHTMLElements } from "@shared/types.js";
// import { inputParserClass } from "./inputParser.js"
// import { paddleSize, paddleOffset } from "@shared/consts.js";




// const canvas = document.getElementById("pong") as HTMLCanvasElement;
// const ctx = canvas.getContext("2d")!;
// const inputParser = new inputParserClass();

// let lastTime = 0;
// let player1: Player;
// let player2: Player;
// let ball: Ball;
// let wsClient: WebSocketClient;
// let currentPlayerRole: 'player1' | 'player2' | null = null;
// let gameRunning = false;

// const keys = {
//     KeyA: false,
//     KeyQ: false,
//     KeyD: false,
//     KeyW: false,
//     KeyZ: false,
//     KeyS: false,
//     ArrowUp: false,
//     ArrowDown: false,
//     ArrowLeft: false,
//     ArrowRight: false
// };

// /**
//  * @brief Initialize lobby screen and WebSocket client
//  */
// function initLobby(): void
// {
//     const lobbyScreen = document.getElementById("lobby")!;
//     const gameScreen = document.getElementById("gameScreen")!;
//     const joinButton = document.getElementById("joinGame") as HTMLButtonElement;
//     const playerNameInput = document.getElementById("playerName") as HTMLInputElement;
//     const cancelButton = document.getElementById("cancelWait") as HTMLButtonElement;

// 	const tournamentButtons: TournamentHTMLElements = getTournamentElementsAsHTML();

//     wsClient = new WebSocketClient();
//     setupWebSocketHandlers();
//     setupLobbyEventListeners(joinButton, playerNameInput, cancelButton, lobbyScreen, gameScreen, tournamentButtons);
// }

// function getTournamentElementsAsHTML(): TournamentHTMLElements {
// 	return {
// 			tournamentSetupScreen: document.getElementById("tournamentSetup") as HTMLButtonElement,
// 			joinTournamentButton: document.getElementById("joinTournament") as HTMLButtonElement,
// 			createTournamentButton: document.getElementById("createTournament") as HTMLButtonElement,
// 			cancelTournamentButton: document.getElementById("cancelTournament") as HTMLButtonElement,
// 			tournamentNameInput: document.getElementById("tournamentName") as HTMLInputElement,
// 			playerCountInput: document.getElementById("playerCount") as HTMLInputElement
// 	};
// }

// /**
//  * @brief Initialize game objects and event listeners
//  */
// function initGame(): void
// {
//     const paddleY = canvas.height / 2 - paddleSize / 2;

//     player1 = new Player("Player 1", paddleOffset, paddleY);
//     player2 = new Player("Player 2", canvas.width - paddleOffset - 10, paddleY);
//     ball = new Ball(canvas.width / 2, canvas.height / 2);
//     setupGameEventListeners();
// }

// /**
//  * @brief Setup WebSocket event handlers
//  */
// function setupWebSocketHandlers(): void
// {
//     wsClient.onWaitingForPlayer = () => {
//         showWaitingScreen();
//     };
//     wsClient.onPlayerJoined = (playerCount: number) => {
//         updatePlayerCount(playerCount);
//     };
//     wsClient.onGameStart = (playerRole: 'player1' | 'player2') => {
//         currentPlayerRole = playerRole;
//         startGame(playerRole);
//     };
//     wsClient.onGameState = (gameState: GameState) => {
//         updateGameState(gameState);
//     };
//     wsClient.onDisconnected = () => {
//         showError("Connexion perdue avec le serveur");
//         returnToLobby();
//     };
//     wsClient.onError = (error: string) => {
//         showError(error);
//     };
// }

// /**
//  * @brief Setup lobby event listeners
//  * @param joinButton Join game button
//  * @param playerNameInput Player name input field
//  * @param cancelButton Cancel waiting button
//  * @param lobbyScreen Lobby screen element
//  * @param gameScreen Game screen element
//  */
// function setupLobbyEventListeners(joinButton: HTMLButtonElement, playerNameInput: HTMLInputElement, 
//                                  cancelButton: HTMLButtonElement, lobbyScreen: HTMLElement, gameScreen: HTMLElement,
// 								 tournamentButtons: TournamentHTMLElements): void
// {
// 	const getPlayerName = () => playerNameInput.value.trim() ; 

// 	joinButton.addEventListener('click', async () => {

// 		if (inputParser.parsePlayerName(getPlayerName()) === false)
// 			return;
//         try {
//             await wsClient.connect(`ws://${window.location.host}/game`);
//             wsClient.joinGame(getPlayerName());
//         } catch (error) {
//             showError("Impossible de se connecter au serveur");
//         }
//     });

//     const joinAIButton = document.getElementById("joinAI") as HTMLButtonElement;
//     if (joinAIButton) {
//         joinAIButton.addEventListener('click', async () => {
//             const playerName = playerNameInput.value.trim();
//             if (!playerName) {
//                 showError("Veuillez entrer votre nom");
//                 return;
//             }
//             try {
//                 await wsClient.connect(`ws://${window.location.host}/game`);
//                 wsClient.joinAIGame(playerName);
//             } catch (error) {
//                 showError("Impossible de se connecter au serveur");
//             }
//         });
//     }
//     cancelButton.addEventListener('click', () => {
//         wsClient.disconnect();
//         returnToLobby();
//     });

// 	tournamentButtons.joinTournamentButton.addEventListener('click', async () => {
// 		if (inputParser.parsePlayerName(getPlayerName()) === false)
// 			return;
// 		showTournamentScreen(lobbyScreen, tournamentButtons.tournamentSetupScreen);	
// 	});

// 	tournamentButtons.createTournamentButton.addEventListener('click', async () => {
// 		const tournamentName = tournamentButtons.tournamentNameInput.value.trim();
// 		const nbPlayers = Number(tournamentButtons.playerCountInput.value.trim());
// 		if (inputParser.parseTournament(tournamentName, nbPlayers) === false)
// 			return;
// 	})

// 	tournamentButtons.cancelTournamentButton.addEventListener('click', async () => { //?Should I just use returnToLobby()?
// 		returnToLobby();
// 	})
// }

// /**
//  * @brief Setup keyboard event listeners for game controls
//  */
// function setupGameEventListeners(): void
// {
//     document.addEventListener('keydown', (event) => {
//         if (event.code in keys)
//             keys[event.code as keyof typeof keys] = true;
//     });
//     document.addEventListener('keyup', (event) => {
//         if (event.code in keys)
//             keys[event.code as keyof typeof keys] = false;
//     });
// }

// /**
//  * @brief Main game loop
//  * @param currentTime Current timestamp
//  */
// function gameLoop(currentTime: number): void
// {
//     const deltaTime = currentTime - lastTime;
    
//     if (!gameRunning)
//         return;
//     lastTime = currentTime;
//     sendInputToServer();
//     render();
//     updatePing();
//     requestAnimationFrame(gameLoop);
// }

// function sendInputToServer(): void
// {
//     if (!wsClient.isConnected() || !currentPlayerRole) return;

//     const input: GameInput = {
//         playerId: currentPlayerRole,
//         keys: {
//             up: keys.KeyQ || keys.KeyW || keys.KeyZ || keys.KeyA || keys.ArrowUp || keys.ArrowRight,
//             down: keys.KeyD || keys.KeyS || keys.ArrowDown || keys.ArrowLeft
//         }
//     };

//     wsClient.sendInput(input);
// }

// function updateGameState(gameState: GameState): void
// {
//     if (!player1 || !player2 || !ball) return;

//     // Vérifier si quelqu'un a marqué un point
//     const oldScore1 = player1.score;
//     const oldScore2 = player2.score;

//     player1.paddle.positionY = gameState.player1.paddle.y;
//     player1.score = gameState.player1.score;
    
//     player2.paddle.positionY = gameState.player2.paddle.y;
//     player2.score = gameState.player2.score;
    
//     ball.positionX = gameState.ball.x;
//     ball.positionY = gameState.ball.y;
//     ball.velocityX = gameState.ball.vx;
//     ball.velocityY = gameState.ball.vy;

//     // Logger les changements de score
//     if (player1.score > oldScore1) {
//         console.log(`[GAME] POINT POUR PLAYER 1! Score: ${player1.score} - ${player2.score}`);
//     }
//     if (player2.score > oldScore2) {
//         console.log(`[GAME] POINT POUR PLAYER 2! Score: ${player1.score} - ${player2.score}`);
//     }

//     // Logger toutes les informations de la partie (moins fréquent)
//     if (Math.random() < 0.05) { // 5% de chance à chaque frame
//         console.log('[GAME] Etat du jeu:', {
//             score: `${player1.score} - ${player2.score}`,
//             ball: {
//                 position: `(${Math.round(gameState.ball.x)}, ${Math.round(gameState.ball.y)})`,
//                 velocity: `(${Math.round(gameState.ball.vx)}, ${Math.round(gameState.ball.vy)})`
//             },
//             paddles: {
//                 player1: Math.round(gameState.player1.paddle.y),
//                 player2: Math.round(gameState.player2.paddle.y)
//             },
//             playerRole: currentPlayerRole
//         });
//     }
// }

// function showWaitingScreen(): void
// {
//     const lobbyContent = document.getElementById("lobby-content")!;
//     const waitingDiv = document.getElementById("waiting")!;
    
//     lobbyContent.classList.add("hidden");
//     waitingDiv.classList.remove("hidden");
// }

// function showTournamentScreen( lobbyScreen: HTMLElement, tournamentSetupScreen: HTMLButtonElement): void 
// {
// 	lobbyScreen.classList.add("hidden");
// 	tournamentSetupScreen.classList.remove("hidden");
// }

// function updatePlayerCount(playerCount: number): void
// {
//     const playerCountSpan = document.getElementById("playerCount")!;
//     playerCountSpan.textContent = playerCount.toString();
// }

// function startGame(playerRole: 'player1' | 'player2'): void
// {
//     const lobbyScreen = document.getElementById("lobby")!;
//     const gameScreen = document.getElementById("gameScreen")!;
//     const yourRoleSpan = document.getElementById("yourRole")!;
    
//     lobbyScreen.classList.add("hidden");
//     gameScreen.classList.remove("hidden");
//     yourRoleSpan.textContent = playerRole === 'player1' ? 'Joueur 1 (Gauche)' : 'Joueur 2 (Droite)';
    
//     initGame();
//     gameRunning = true;
//     gameLoop(0);
// }

// function returnToLobby(): void
// {
//     const lobbyScreen = document.getElementById("lobby")!;
//     const gameScreen = document.getElementById("gameScreen")!;
//     const lobbyContent = document.getElementById("lobby-content")!;
//     const waitingDiv = document.getElementById("waiting")!;
    
//     gameRunning = false;
//     currentPlayerRole = null;
    
//     gameScreen.classList.add("hidden");
//     lobbyScreen.classList.remove("hidden");
//     waitingDiv.classList.add("hidden");
//     lobbyContent.classList.remove("hidden");
// }

// function showError(message: string): void
// {
//     alert(message);
// }

// function updatePing(): void
// {
//     if (Math.random() < 0.1) {
//         wsClient.sendPing();
//     }
    
//     const pingSpan = document.getElementById("ping")!;
//     pingSpan.textContent = wsClient.getPing().toString();
// }

// function render(): void
// {
//     ctx.fillStyle = COLORS.SONPI16_BLACK;
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     player1.paddle.render(ctx, COLORS.SONPI16_ORANGE);
//     player2.paddle.render(ctx, COLORS.SONPI16_ORANGE);
//     ball.render(ctx, COLORS.SONPI16_ORANGE);

//     renderScore();
// }

// function renderScore(): void
// {
//     ctx.fillStyle = COLORS.SONPI16_ORANGE;
//     ctx.font = `bold 48px ${FONTS.QUENCY_PIXEL}`;
//     ctx.textAlign = "center";
//     ctx.fillText(`${player1.score} - ${player2.score}`, canvas.width / 2, 60);
// }

// initLobby();
