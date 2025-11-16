import { Player } from "./Player.js";
import { Ball } from "./Ball.js";
import { COLORS, FONTS } from "./constants.js";
import { WebSocketClient } from "./WebSocketClient.js";
import { GameState, GameInput, TournamentHTMLElements } from "../../shared/types.js";
import { inputParserClass } from "./inputParser.js"
import { paddleSize, paddleOffset } from "../../shared/consts.js";

console.log('[MAIN] Module main.ts chargé');

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
const inputParser = new inputParserClass();

let lastTime = 0;
let player1: Player;
let player2: Player;
let ball: Ball;
let wsClient: WebSocketClient;
let currentPlayerRole: 'player1' | 'player2' | null = null;
let gameRunning = false;

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
 * @brief Initialize lobby screen and WebSocket client
 */
function initLobby(): void
{
    console.log('[INIT LOBBY] Début de l\'initialisation');
    const lobbyScreen = document.getElementById("lobby")!;
    const gameScreen = document.getElementById("gameScreen")!;
    const joinButton = document.getElementById("joinGame") as HTMLButtonElement;
    const playerNameInput = document.getElementById("playerName") as HTMLInputElement;
    const cancelButton = document.getElementById("cancelWait") as HTMLButtonElement;

    console.log('[INIT LOBBY] Elements récupérés');
	const tournamentButtons: TournamentHTMLElements = getTournamentElementsAsHTML();

    console.log('[INIT LOBBY] Création du WebSocketClient');
    wsClient = new WebSocketClient();
    setupWebSocketHandlers();
    console.log('[INIT LOBBY] Setup des event listeners');
    setupLobbyEventListeners(joinButton, playerNameInput, cancelButton, lobbyScreen, gameScreen, tournamentButtons);
    console.log('[INIT LOBBY] Initialisation terminée');
}

function getTournamentElementsAsHTML(): TournamentHTMLElements {
	return {
			tournamentSetupScreen: document.getElementById("tournamentSetup") as HTMLButtonElement,
			joinTournamentButton: document.getElementById("joinTournament") as HTMLButtonElement,
			createTournamentButton: document.getElementById("createTournament") as HTMLButtonElement,
			cancelTournamentButton: document.getElementById("cancelTournament") as HTMLButtonElement,
			tournamentNameInput: document.getElementById("tournamentName") as HTMLInputElement,
			playerCountInput: document.getElementById("playerCount") as HTMLInputElement
	};
}

/**
 * @brief Initialize game objects and event listeners
 */
function initGame(): void
{
    console.log('[INIT GAME] Initialisation du jeu');
    canvas = document.getElementById("pong") as HTMLCanvasElement;
    ctx = canvas.getContext("2d")!;
    
    const paddleY = canvas.height / 2 - paddleSize / 2;

    player1 = new Player("Player 1", paddleOffset, paddleY);
    player2 = new Player("Player 2", canvas.width - paddleOffset - 10, paddleY);
    ball = new Ball(canvas.width / 2, canvas.height / 2);
    setupGameEventListeners();
}

/**
 * @brief Setup WebSocket event handlers
 */
function setupWebSocketHandlers(): void
{
    wsClient.onWaitingForPlayer = () => {
        showWaitingScreen();
    };
    wsClient.onPlayerJoined = (playerCount: number) => {
        updatePlayerCount(playerCount);
    };
    wsClient.onGameStart = (playerRole: 'player1' | 'player2') => {
        currentPlayerRole = playerRole;
        startGame(playerRole);
    };
    wsClient.onGameState = (gameState: GameState) => {
        updateGameState(gameState);
    };
    wsClient.onDisconnected = () => {
        showError("Connexion perdue avec le serveur");
        returnToLobby();
    };
    wsClient.onError = (error: string) => {
        showError(error);
    };
}

/**
 * @brief Setup lobby event listeners
 * @param joinButton Join game button
 * @param playerNameInput Player name input field
 * @param cancelButton Cancel waiting button
 * @param lobbyScreen Lobby screen element
 * @param gameScreen Game screen element
 */
function setupLobbyEventListeners(joinButton: HTMLButtonElement, playerNameInput: HTMLInputElement, 
                                 cancelButton: HTMLButtonElement, lobbyScreen: HTMLElement, gameScreen: HTMLElement,
								 tournamentButtons: TournamentHTMLElements): void
{
	const getPlayerName = () => playerNameInput.value.trim() ; 

	joinButton.addEventListener('click', async () => {

		if (inputParser.parsePlayerName(getPlayerName()) === false)
			return;
        try {
            await wsClient.connect(`ws://${window.location.host}/game`);
            wsClient.joinGame(getPlayerName());
        } catch (error) {
            showError("Impossible de se connecter au serveur");
        }
    });

    const joinAIButton = document.getElementById("joinAI") as HTMLButtonElement;
    if (joinAIButton) {
        joinAIButton.addEventListener('click', async () => {
            const playerName = playerNameInput.value.trim();
            if (!playerName) {
                showError("Veuillez entrer votre nom");
                return;
            }
            try {
                await wsClient.connect(`ws://${window.location.host}/game`);
                wsClient.joinAIGame(playerName);
            } catch (error) {
                showError("Impossible de se connecter au serveur");
            }
        });
    }
    const joinCustomButton = document.getElementById("joinCustom") as HTMLButtonElement;
    
    console.log('[INIT] joinCustom button:', joinCustomButton);
    if (joinCustomButton) {
        joinCustomButton.addEventListener('click', async () => {
            console.log('[CUSTOM] Button clicked!');
            if (inputParser.parsePlayerName(getPlayerName()) === false)
                return;
            try {
                console.log('[CUSTOM] Connecting to server...');
                await wsClient.connect(`ws://${window.location.host}/game`);
                console.log('[CUSTOM] Joining custom game...');
                wsClient.joinCustomGame(getPlayerName());
            } catch (error) {
                console.error('[CUSTOM] Error:', error);
                showError("Impossible de se connecter au serveur");
            }
        });
    }
    const joinCustomAIButton = document.getElementById("joinCustomAI") as HTMLButtonElement;
    
    console.log('[INIT] joinCustomAI button:', joinCustomAIButton);
    if (joinCustomAIButton) {
        joinCustomAIButton.addEventListener('click', async () => {
            console.log('[CUSTOM AI] Button clicked!');
            if (inputParser.parsePlayerName(getPlayerName()) === false)
                return;
            try {
                console.log('[CUSTOM AI] Connecting to server...');
                await wsClient.connect(`ws://${window.location.host}/game`);
                console.log('[CUSTOM AI] Joining custom AI game...');
                wsClient.joinCustomAIGame(getPlayerName());
            } catch (error) {
                console.error('[CUSTOM AI] Error:', error);
                showError("Impossible de se connecter au serveur");
            }
        });
    }
    cancelButton.addEventListener('click', () => {
        wsClient.disconnect();
        returnToLobby();
    });

	tournamentButtons.joinTournamentButton.addEventListener('click', async () => {
		if (inputParser.parsePlayerName(getPlayerName()) === false)
			return;
		showTournamentScreen(lobbyScreen, tournamentButtons.tournamentSetupScreen);	
	});

	tournamentButtons.createTournamentButton.addEventListener('click', async () => {
		const tournamentName = tournamentButtons.tournamentNameInput.value.trim();
		const nbPlayers = Number(tournamentButtons.playerCountInput.value.trim());
		if (inputParser.parseTournament(tournamentName, nbPlayers) === false)
			return;
	})

	tournamentButtons.cancelTournamentButton.addEventListener('click', async () => { //?Should I just use returnToLobby()?
		returnToLobby();
	})
}

/**
 * @brief Setup keyboard event listeners for game controls
 */
function setupGameEventListeners(): void
{
    document.addEventListener('keydown', (event) => {
        if (event.code in keys)
            keys[event.code as keyof typeof keys] = true;
    });
    document.addEventListener('keyup', (event) => {
        if (event.code in keys)
            keys[event.code as keyof typeof keys] = false;
    });
}

/**
 * @brief Main game loop
 * @param currentTime Current timestamp
 */
function gameLoop(currentTime: number): void
{
    const deltaTime = currentTime - lastTime;
    
    if (!gameRunning)
        return;
    lastTime = currentTime;
    sendInputToServer();
    render();
    updatePing();
    requestAnimationFrame(gameLoop);
}

function sendInputToServer(): void
{
    if (!wsClient.isConnected() || !currentPlayerRole) return;

    const input: GameInput = {
        playerId: currentPlayerRole,
        keys: {
            up: keys.KeyQ || keys.KeyW || keys.KeyZ || keys.KeyA || keys.ArrowUp || keys.ArrowRight,
            down: keys.KeyD || keys.KeyS || keys.ArrowDown || keys.ArrowLeft,
            slot1: keys.Digit1,
            slot2: keys.Digit2,
            slot3: keys.Digit3
        }
    };

    wsClient.sendInput(input);
    if (keys.Digit1) keys.Digit1 = false;
    if (keys.Digit2) keys.Digit2 = false;
    if (keys.Digit3) keys.Digit3 = false;
}

function updateGameState(gameState: GameState): void
{
    if (!player1 || !player2 || !ball) return;
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
    if (player1.score > oldScore1)
        console.log(`[GAME] POINT POUR PLAYER 1! Score: ${player1.score} - ${player2.score}`);
    if (player2.score > oldScore2)
        console.log(`[GAME] POINT POUR PLAYER 2! Score: ${player1.score} - ${player2.score}`);
    if (gameState.player1.itemSlots)
        renderPowerUps('player1', gameState.player1.itemSlots, 
            gameState.player1.selectedSlots, gameState.player1.pendingPowerUps);
    if (gameState.player2.itemSlots)
        renderPowerUps('player2', gameState.player2.itemSlots,
            gameState.player2.selectedSlots, gameState.player2.pendingPowerUps);
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

function showTournamentScreen( lobbyScreen: HTMLElement, tournamentSetupScreen: HTMLButtonElement): void 
{
	lobbyScreen.classList.add("hidden");
	tournamentSetupScreen.classList.remove("hidden");
}

function updatePlayerCount(playerCount: number): void
{
    const playerCountSpan = document.getElementById("playerCount")!;
    playerCountSpan.textContent = playerCount.toString();
}

function startGame(playerRole: 'player1' | 'player2'): void
{
    const lobbyScreen = document.getElementById("lobby")!;
    const gameScreen = document.getElementById("gameScreen")!;
    const yourRoleSpan = document.getElementById("yourRole")!;
    
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    yourRoleSpan.textContent = playerRole === 'player1' ? 'Joueur 1 (Gauche)' : 'Joueur 2 (Droite)';
    
    initGame();
    gameRunning = true;
    gameLoop(0);
}

function returnToLobby(): void
{
    const lobbyScreen = document.getElementById("lobby")!;
    const gameScreen = document.getElementById("gameScreen")!;
    const lobbyContent = document.getElementById("lobby-content")!;
    const waitingDiv = document.getElementById("waiting")!;
    
    gameRunning = false;
    currentPlayerRole = null;
    
    gameScreen.classList.add("hidden");
    lobbyScreen.classList.remove("hidden");
    waitingDiv.classList.add("hidden");
    lobbyContent.classList.remove("hidden");
}

function showError(message: string): void
{
    alert(message);
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
    ctx.fillStyle = COLORS.SONPI16_BLACK;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    player1.paddle.render(ctx, COLORS.SONPI16_ORANGE);
    player2.paddle.render(ctx, COLORS.SONPI16_ORANGE);
    ball.render(ctx, COLORS.SONPI16_ORANGE);

    renderScore();
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
 */
function renderPowerUps(player: 'player1' | 'player2',
    itemSlots: (string | null)[],
    selectedSlots?: boolean[],
    pendingPowerUps?: (string | null)[]): void
{
    const container = document.getElementById(
        `powerUpsPlayer${player === 'player1' ? '1' : '2'}`
    );
    const iconMap: { [key: string]: string } = {
        'Son': './assets/images/son-256x.png',
        'Pi': './assets/images/pi-256x.png',
        '16': './assets/images/16-256x.png'
    };

    if (!container)
        return;
    container.innerHTML = '';
    itemSlots.forEach((powerUp, index) => {
        const slotDiv = document.createElement('div');
        const isSelected = selectedSlots?.[index] || false;

        slotDiv.className = `w-12 h-12 border-2 bg-sonpi16-black rounded flex items-center justify-center`;
        slotDiv.style.fontFamily = FONTS.QUENCY_PIXEL;
        if (isSelected) {
            slotDiv.style.border = '4px solid #ff6000';
            slotDiv.style.boxShadow = '0 0 15px #ff6000, inset 0 0 10px rgba(255, 96, 0, 0.3)';
        } else {
            slotDiv.style.border = '2px solid #ff6000';
        }
        if (powerUp && iconMap[powerUp]) {
            const img = document.createElement('img');

            img.src = iconMap[powerUp];
            img.className = 'w-10 h-10';
            img.alt = powerUp;
            slotDiv.appendChild(img);
        } else {
            const keyLabel = document.createElement('span');

            keyLabel.textContent = (index + 1).toString();
            keyLabel.className = 'text-sonpi16-orange text-xs';
            slotDiv.appendChild(keyLabel);
        }
        container.appendChild(slotDiv);
    });
    if (pendingPowerUps && pendingPowerUps.length > 0) {
        const pendingContainer = document.createElement('div');

        pendingContainer.className = 'mt-2 flex gap-1';
        pendingPowerUps.forEach(powerUp => {
            if (powerUp && iconMap[powerUp]) {
                const pendingDiv = document.createElement('div');

                pendingDiv.className = 'w-8 h-8 border-4 border-sonpi16-orange bg-sonpi16-black rounded flex items-center justify-center';
                const img = document.createElement('img');

                img.src = iconMap[powerUp];
                img.className = 'w-6 h-6';
                img.alt = powerUp;
                pendingDiv.appendChild(img);
                pendingContainer.appendChild(pendingDiv);
            }
        });
        container.appendChild(pendingContainer);
    }
}

console.log('[MAIN] Appel de initLobby()');
initLobby();
console.log('[MAIN] initLobby() terminé');
