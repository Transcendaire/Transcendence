import { Player } from "./Player.js";
import { Ball } from "./Ball.js";
import { COLORS, FONTS } from "./constants.js";
import { WebSocketClient } from "./WebSocketClient.js";
import { GameState, GameInput } from "../../server/src/types.js";
import { TournamentHTMLElements } from "../../server/src/types.js"
import { inputParserClass } from "./inputParser.js"
import { getDatabase } from "../../server/src/db/databaseSingleton.js"
import { paddleSize, paddleOffset } from "../../server/src/consts.js";


const canvas = document.getElementById("pong") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
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
    ArrowRight: false
};

/**
 * @brief Initialize lobby screen and WebSocket client
 */
function initLobby(): void
{
    wsClient = new WebSocketClient();
    setupWebSocketHandlers();
    setupLobbyEventListeners();
	setupTournamentListEventListeners();
	setupTournamentSetupEventListeners();
}


/**
 * @brief Initialize game objects and event listeners
 */
function initGame(): void
{
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
function setupLobbyEventListeners(): void
{
    const playerNameInput = document.getElementById("playerName") as HTMLInputElement;

	const getPlayerName = () => playerNameInput.value.trim() ; 

    const joinGameButton = document.getElementById("lobbyJoinGameButton") as HTMLButtonElement;
	joinGameButton.addEventListener('click', async () => { //! Didn't add a check to see if playerName already exists in database, since its a one match only situation

		if (inputParser.parsePlayerName(getPlayerName()) === false)
			return;
        try {
            await wsClient.connect(`ws://${window.location.host}/game`);
            wsClient.joinGame(getPlayerName());
        } catch (error) {
            showError("Impossible de se connecter au serveur");
        }
    });

    const joinAIButton = document.getElementById("lobbyJoinAIButton") as HTMLButtonElement;
    if (joinAIButton) {
        joinAIButton.addEventListener('click', async () => {
            const playerName = playerNameInput.value.trim();
            if (inputParser.parsePlayerName(getPlayerName()) === false) {
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

	const showTournamentListButton = document.getElementById("lobbyJoinTournamentListButton") as HTMLButtonElement;
    showTournamentListButton.addEventListener('click', () => {
        if (inputParser.parsePlayerName(getPlayerName()) === false)
            return;
        showTournamentListScreen();
    });

	const showCreateTournamentButton = document.getElementById("lobbyCreateTournamentButton") as HTMLButtonElement;
    showCreateTournamentButton?.addEventListener('click', () => {
        if (inputParser.parsePlayerName(getPlayerName()) === false)
            return;
        showTournamentSetupScreen();
    });

    const cancelButton = document.getElementById("cancelWait") as HTMLButtonElement;
    cancelButton.addEventListener('click', () => {
        wsClient.disconnect();
        returnToLobby();
    });
}


/**
 * @brief Setup tournament list screen event listeners
 */
function setupTournamentListEventListeners(): void
{
	const createTournamentButton = document.getElementById('tournamentListCreateButton') as HTMLButtonElement;
	createTournamentButton.addEventListener('click', () => {
		showTournamentSetupScreen();
	});

	const refreshButton = document.getElementById('tournamentListRefreshButton') as HTMLButtonElement;
    refreshButton.addEventListener('click', () => {
        loadTournamentList();
    });

    const backButton = document.getElementById('tournamentListBackButton') as HTMLButtonElement;
    backButton.addEventListener('click', () => {
        returnToLobby();
    });

    const container = document.getElementById('tournamentListContainer')!;
    container.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        if (target.tagName === 'BUTTON' && target.dataset.tournamentId)
		{
            const tournamentId = target.dataset.tournamentId;
            const tournamentName = target.dataset.tournamentName || 'Unknown';
            if (target.dataset.action === 'leave')
				handleLeaveTournament(tournamentId);
			else
				handleJoinTournament(tournamentId, tournamentName);
        }
    });	
}


/**
 * @brief Setup tournament setup screen event listeners
 */
function setupTournamentSetupEventListeners(): void {
	
	const submitButton = document.getElementById('tournamentSetupSubmitButton') as HTMLButtonElement;
    submitButton.addEventListener('click', async () => {
		const nameInput = document.getElementById('tournamentName') as HTMLInputElement;
        const countInput = document.getElementById('tournamentPlayerCount') as HTMLInputElement;
		const playerNameInput = document.getElementById('playerName') as HTMLInputElement;

        const tournamentName = nameInput.value.trim();
        const nbPlayers = Number(countInput.value.trim());
		const playerName = playerNameInput.value.trim();

        if (inputParser.parseTournament(tournamentName, nbPlayers) === false)
            return;
		if (inputParser.parsePlayerName(playerName) === false)
            return;

		try {
			const response = await fetch('/api/tournaments', {
				method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
					name: tournamentName,
                    maxPlayers: nbPlayers,
					creatorName: playerName
                })
            });
            
            const data = await response.json();
            if (!response.ok) {
				showError(data.error || 'Impossible de créer le tournoi');
                return;
            }
            
            console.log('Tournament created:', data);
			
            showTournamentListScreen();
        } catch (error) {
			showError('Erreur réseau');
        }
    });
    
	const cancelButton = document.getElementById('tournamentSetupCancelButton') as HTMLButtonElement;
    cancelButton.addEventListener('click', () => {
        returnToLobby();
    });
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
 * @brief Shows tournament setup screen
 */
function showTournamentSetupScreen(): void {
    document.getElementById('lobby')!.classList.add('hidden');
    document.getElementById('tournamentList')!.classList.add('hidden');
    document.getElementById('tournamentSetup')!.classList.remove('hidden');
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
    alert(message);77777
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
            down: keys.KeyD || keys.KeyS || keys.ArrowDown || keys.ArrowLeft
        }
    };

    wsClient.sendInput(input);
}

function updateGameState(gameState: GameState): void
{
    if (!player1 || !player2 || !ball) return;

    // Vérifier si quelqu'un a marqué un point
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

    // Logger les changements de score
    if (player1.score > oldScore1) {
        console.log(`[GAME] POINT POUR PLAYER 1! Score: ${player1.score} - ${player2.score}`);
    }
    if (player2.score > oldScore2) {
        console.log(`[GAME] POINT POUR PLAYER 2! Score: ${player1.score} - ${player2.score}`);
    }

    // Logger toutes les informations de la partie (moins fréquent)
    if (Math.random() < 0.05) { // 5% de chance à chaque frame
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


async function loadTournamentList(): Promise<void> {
    const container = document.getElementById('tournamentListContainer')!;

	const playerName = (document.getElementById('playerName') as HTMLInputElement).value.trim();
	
    try {
        const response = await fetch(`/api/tournaments?playerName=${encodeURIComponent(playerName)}`);
        const data = await response.json();
        console.log(data);
        
        if (!response.ok)
            throw new Error('Failed to load tournaments');
        
        container.innerHTML = '';
        
        if (data.tournaments.length === 0)
		{
            container.innerHTML = `
                <p class="text-sonpi16-orange text-center" style="font-family: QuencyPixel-Regular;">
                    Aucun tournoi disponible
                </p>
            `;
            return;
        }
        
        data.tournaments.forEach((tournament: any) => {
    		const div = document.createElement('div');
    		div.className = 'bg-sonpi16-orange p-4 rounded flex justify-between items-center hover:opacity-80 transition-opacity';
    		div.style.fontFamily = 'QuencyPixel-Regular';

    		div.innerHTML = `
    		    <div class="text-left text-sonpi16-black">
    		        <p class="font-bold text-lg">${tournament.name}</p>
    		        <p class="text-sm">Joueurs: ${tournament.currentPlayers}/${tournament.maxPlayers}</p>
    		        <p class="text-xs">Statut: ${tournament.status}</p>
    		    </div>
    		    ${tournament.isMember ? `
    		        <button data-tournament-id="${tournament.id}"
    		                data-action="leave"
    		                class="bg-sonpi16-black text-sonpi16-orange px-4 py-2 rounded font-bold">
    		            QUITTER
    		        </button>
    		    ` : `
    		        <button data-tournament-id="${tournament.id}" 
    		                data-tournament-name="${tournament.name}"
    		                class="bg-sonpi16-black text-sonpi16-orange px-4 py-2 rounded font-bold">
    		            REJOINDRE
    		        </button>
    		    `}
    		`;
            
            container.appendChild(div);
        });
        
    } catch (error) {
        container.innerHTML = `<p class="text-red-500">Erreur chargement</p>`;
    }
}


async function handleJoinTournament(tournamentId: string, tournamentName: string): Promise<void>
{
	console.log(`Joining tournament ${tournamentName}`);

	const input = document.getElementById('playerName') as HTMLInputElement;
	const playerName = input.value.trim();
	if (inputParser.parsePlayerName(playerName) === false)
		return ;

	try {
		const response = await fetch(`/api/tournaments/${tournamentId}/join`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				playerName: playerName
			})
		});
		const data = await response.json();
		if (!response.ok) {
			showError(data.error || `Impossible de rejoindre le tournoi ${tournamentName}`);
			return ;
		}
		loadTournamentList();
	} catch (error)
	{
		console.error('Failed to join tournament: ', error);
		showError('Erreur réseau')
	};
}


async function handleLeaveTournament(tournamentId: string): Promise<void>
{
	const input = document.getElementById('playerName') as HTMLInputElement;
	const playerName = input.value.trim();
	if (inputParser.parsePlayerName(playerName) === false)
		return ;

	try {
		const response = await fetch(`/api/tournaments/${tournamentId}/leave`, {
			method: 'POST',
			headers: { 'Content-Type': 'Application/json' },
			body: JSON.stringify({ playerName })
		});
		const data = await response.json();
		if (!response.ok)
		{
			showError(data.error || 'Impossible de quitter le tournoi');
			return ;
		}
		loadTournamentList();
	} catch (error) {
		showError('Erreur réseau');
	}
}

/**
 * @brief Shows tournament list screen
 */
function showTournamentListScreen(): void {
    document.getElementById('lobby')!.classList.add('hidden');
    document.getElementById('tournamentList')!.classList.remove('hidden');
    loadTournamentList();
}




initLobby();
