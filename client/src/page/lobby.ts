import { navigate, registerPageInitializer } from "../router"
import { wsClient, getWebSocketUrl } from "../components/WebSocketClient";
import { getEl, show, hide, setupGlobalModalEvents } from "../app";
import { playerName } from "./home";
import { getUserWithCookies } from "../components/auth";
import type { Lobby, LobbyPlayer, OnlinePlayer, PlayerOnlineStatus } from "@shared/types";

let currentLobbies: Lobby[] = [];
let myPlayerId: string | null = null;
let currentOpenLobbyId: string | null = null;
let currentOnlinePlayers: OnlinePlayer[] = [];
let currentPlayerName: string = "";

async function initLobby() {
    console.log('[LOBBY] Initialisation de la page lobby');

    currentPlayerName = playerName || await getUserWithCookies() || "";
    if (!currentPlayerName) {
        console.error('[LOBBY] No player name found, redirecting to home');
        navigate('home');
        return;
    }

    const createLobbyModal = getEl("createLobbyModal");

    getEl("backHome").addEventListener('click', () => navigate("home"));

    setupWebSocketCallbacks();
    initCreationModal(createLobbyModal);
    requestLobbyList();
    requestOnlinePlayers();
}

function setupWebSocketCallbacks(): void {
    console.log('[LOBBY] Configuration des callbacks WebSocket');

    wsClient.onLobbyCreated = (lobbyId: string, lobby: Lobby) => {
        console.log('[LOBBY] Lobby créé:', lobbyId, lobby);
        setupLobbyModal(lobby);
        requestLobbyList();
    };

    wsClient.onLobbyUpdate = (lobby: Lobby) => {
        console.log('[LOBBY] Mise à jour du lobby:', lobby);
        requestLobbyList();

        if (currentOpenLobbyId === lobby.id) {
            setupLobbyModal(lobby);
        }
    };

    wsClient.onLobbyList = (lobbies: Lobby[]) => {
        console.log('[LOBBY] Liste des lobbies reçue:', lobbies);
        currentLobbies = lobbies;
        renderLobbies(lobbies);
    };

    wsClient.onLobbyError = (message: string) => {
        console.error('[LOBBY] Erreur lobby:', message);
        alert(`Erreur: ${message}`);
    };

    wsClient.onGameStart = (playerRole: 'player1' | 'player2') => {
        console.log(`[LOBBY] Match de tournoi démarre! Rôle: ${playerRole}`);
        sessionStorage.setItem('playerRole', playerRole);
        navigate('game');
    };
    
    wsClient.onTournamentPrepare = (playerRole: 'player1' | 'player2', opponentName: string) => {
        console.log(`[LOBBY] Préparation tournoi: ${playerRole} vs ${opponentName}`);
        sessionStorage.setItem('playerRole', playerRole);
        sessionStorage.setItem('tournamentOpponent', opponentName);
        navigate('game');
    };

    wsClient.onAlreadyConnected = (name: string) => {
        const lobbyModal = document.getElementById('lobbyModal');
        if (lobbyModal)
            hide(lobbyModal);
        const shouldDisconnect = confirm(
            `Vous êtes déjà connecté ailleurs avec le nom "${name}".\n\n` +
            `Voulez-vous déconnecter l'autre session ?`
        );
        if (shouldDisconnect)
            wsClient.forceDisconnectOther(name);
        else
            wsClient.clearPendingAction();
    };

    wsClient.onAlreadyInLobby = (name: string) => {
        const lobbyModal = document.getElementById('lobbyModal');
        if (lobbyModal)
            hide(lobbyModal);
        const shouldDisconnect = confirm(
            `Vous êtes déjà dans un lobby avec le nom "${name}".\n\n` +
            `Voulez-vous quitter l'autre lobby et continuer ?`
        );
        if (shouldDisconnect)
            wsClient.forceDisconnectOther(name);
        else
            wsClient.clearPendingAction();
    };

    wsClient.onAlreadyInGame = (name: string) => {
        const lobbyModal = document.getElementById('lobbyModal');
        if (lobbyModal)
            hide(lobbyModal);
        const shouldDisconnect = confirm(
            `Vous êtes déjà en jeu avec le nom "${name}".\n\n` +
            `Voulez-vous quitter la partie et continuer ?`
        );
        if (shouldDisconnect)
            wsClient.forceDisconnectOther(name);
        else
            wsClient.clearPendingAction();
    };

    wsClient.onDisconnectedByOtherSession = () => {
        alert('Vous avez été déconnecté car une autre session a pris le relais.');
        wsClient.disconnect();
        navigate('home');
    };

    wsClient.onOnlinePlayersList = (players: OnlinePlayer[]) => {
        console.log('[LOBBY] Liste des joueurs en ligne:', players.length);
        currentOnlinePlayers = players;
        renderOnlinePlayers(players);
    };

    wsClient.onFriendStatusUpdate = (friend) => {
        const existing = currentOnlinePlayers.find(p => p.alias === friend.alias);
        if (existing) {
            existing.status = friend.status;
            renderOnlinePlayers(currentOnlinePlayers);
        } else if (friend.status !== 'offline') {
            requestOnlinePlayers();
        }
    };
}

function requestLobbyList(): void {
    console.log('[LOBBY] Demande de la liste des lobbies');
    if (!wsClient.isConnected()) {
        console.log('[LOBBY] WebSocket non connecté, connexion en cours...');
        wsClient.connect(getWebSocketUrl()).then(() => {
            wsClient.sendMessage({ type: 'requestLobbyList' });
            requestOnlinePlayers();
        }).catch((error) => {
            console.error('[LOBBY] Erreur de connexion WebSocket:', error);
        });
    } else {
        wsClient.sendMessage({ type: 'requestLobbyList' });
    }
}

function requestOnlinePlayers(): void {
    if (!currentPlayerName)
        return;
    if (wsClient.isConnected())
        wsClient.requestOnlinePlayers(currentPlayerName);
}

function getStatusColor(status: PlayerOnlineStatus): string
{
    switch (status) {
        case 'in-game': return 'bg-orange-400';
        case 'online': return 'bg-green-400';
        default: return 'bg-gray-500';
    }
}

function getStatusText(status: PlayerOnlineStatus): string
{
    switch (status) {
        case 'in-game': return 'En jeu';
        case 'online': return 'En ligne';
        default: return 'Hors ligne';
    }
}

function getStatusTextColor(status: PlayerOnlineStatus): string
{
    switch (status) {
        case 'in-game': return 'text-orange-400';
        case 'online': return 'text-green-400';
        default: return 'text-gray-400';
    }
}

function renderOnlinePlayers(players: OnlinePlayer[]): void
{
    const container = document.getElementById('friendsList');
    const countEl = document.getElementById('playerCount');

    if (!container || !countEl)
        return;

    const onlinePlayers = players.filter(p => p.status !== 'offline');
    countEl.textContent = onlinePlayers.length.toString();
    if (onlinePlayers.length === 0)
    {
        container.innerHTML = `
            <p class="text-gray-400 text-center py-8 font-quency">
                Aucun joueur en ligne
            </p>
        `;
        return;
    }
    container.innerHTML = onlinePlayers.map(player => {
        const showStatus = player.isFriend && player.status === 'in-game';
        const statusHtml = showStatus
            ? `<div class="flex items-center gap-2">
                   <div class="w-2 h-2 rounded-full ${getStatusColor(player.status)}"></div>
                   <span class="text-xs ${getStatusTextColor(player.status)} font-quency">
                       ${getStatusText(player.status)}
                   </span>
               </div>`
            : '';
        const friendBadge = player.isFriend ? '<span class="text-xs text-sonpi16-orange">⭐ Ami</span>' : '';
        const avatarSrc = player.avatar || '/avatars/defaults/Transcendaire.png';
        return `
        <div class="bg-sonpi16-orange bg-opacity-10 rounded-lg p-3 
                    border-2 ${player.isFriend ? 'border-sonpi16-orange' : 'border-transparent'} 
                    hover:bg-opacity-20 transition-all duration-300">
            <div class="flex items-center gap-3">
                <img src="${avatarSrc}" alt="${player.alias}" 
                     class="w-10 h-10 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-white transition-all"
                     onclick="window.location.href='/profile?alias=${encodeURIComponent(player.alias)}'"
                     onerror="this.src='/avatars/defaults/Transcendaire.png'" />
                <div class="flex-1">
                    <p class="text-sonpi16-orange font-quency font-bold">${player.alias}</p>
                    <div class="flex items-center gap-2">
                        ${statusHtml}
                        ${friendBadge}
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderLobbies(lobbies: Lobby[]): void {
    console.log('[LOBBY] Rendu de', lobbies.length, 'lobbies');
    const lobbyList = getEl("lobbiesList");

    lobbyList.innerHTML = '';

    if (lobbies.length === 0) {
        lobbyList.innerHTML = `
            <div class="text-center text-sonpi16-orange opacity-60 py-8">
                <p class="text-lg font-quency">Aucun lobby disponible</p>
                <p class="text-sm mt-2">Créez-en un pour commencer !</p>
            </div>
        `;
        return;
    }

    lobbies.forEach(lobby => {

        const lobbyDiv = createLobbyElement(lobby);

        const isFull = lobby.players.length >= lobby.maxPlayers;

        const joinButton = lobbyDiv.querySelector('.joinLobby') as HTMLButtonElement;

        if (joinButton && !isFull) {
            joinButton.addEventListener('click', () => {
                setupLobbyModal(lobby);
                joinLobby(lobby.id);
            });
        }
        lobbyList.appendChild(lobbyDiv);
    });
}

function joinLobby(lobbyId: string): void {
    console.log('[LOBBY] Tentative de rejoindre le lobby:', lobbyId);

    if (!currentPlayerName || currentPlayerName.trim() === '') {
        alert('Veuillez vous connecter avant de rejoindre un lobby');
        navigate('home');
        return;
    }

    if (!wsClient.isConnected()) {
        console.error('[LOBBY] WebSocket non connecté');
        alert('Connexion perdue, reconnexion en cours...');
        requestLobbyList();
        return;
    }

    const joinMessage = {
        type: 'joinLobby' as const,
        playerName: currentPlayerName,
        lobbyId: lobbyId
    };
    wsClient.setPendingAction(() => wsClient.sendMessage(joinMessage));
    wsClient.sendMessage(joinMessage);
}

function startLobby(lobbyId: string): void {
    console.log('[LOBBY] Tentative de lancer le lobby:', lobbyId);

    if (!wsClient.isConnected()) {
        console.error('[LOBBY] WebSocket non connecté');
        alert('Connexion perdue, reconnexion en cours...');
        requestLobbyList();
        return;
    }

    wsClient.sendMessage({
        type: 'startLobby',
        lobbyId: lobbyId
    });
}

function deleteLobby(lobbyId: string): void {
    console.log('[LOBBY] Tentative de supprimer le lobby:', lobbyId);

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce lobby ?')) {
        return;
    }

    if (!wsClient.isConnected()) {
        console.error('[LOBBY] WebSocket non connecté');
        alert('Connexion perdue, reconnexion en cours...');
        requestLobbyList();
        return;
    }

    wsClient.sendMessage({
        type: 'deleteLobby',
        lobbyId: lobbyId
    });
}

function initCreationModal(createLobbyModal: HTMLElement) {
    const tournamentName = getEl("tournamentName") as HTMLInputElement;
    const createLobbyButton = getEl('createLobbyButton') as HTMLButtonElement;
    const cancelCreateButton = getEl('cancelCreateButton') as HTMLButtonElement;
    const form = getEl('creationForm') as HTMLFormElement;
    const gameModeSelect = getEl("gameMode") as HTMLSelectElement;
    const fruitFrequencyDiv = getEl("powerfruitsfrequency");

    gameModeSelect.addEventListener('change', () => {
        if (gameModeSelect.value === "Normal")
            fruitFrequencyDiv.classList.add("hidden");
        else
            fruitFrequencyDiv.classList.remove("hidden");
    });

    setupGlobalModalEvents(createLobbyModal, createLobbyButton, cancelCreateButton);

    form?.addEventListener('submit', (e) => {
        e.preventDefault();

        let name = tournamentName.value.trim();

        const gameType = getEl("gameType") as HTMLSelectElement;
        const gameMode = getEl("gameMode") as HTMLSelectElement;
        const mode = gameMode.value;
        const nbPlayer = getEl("nbPlayer") as HTMLSelectElement;
        const maxPlayers = parseInt(nbPlayer?.value || '2');
        const fruitFrequencySelect = getEl("fruitFrequencySelect") as HTMLSelectElement;
        const fruitFrequency = fruitFrequencySelect?.value as 'low' | 'normal' | 'high' || 'normal';
        const maxScoreSelect = getEl("maxScoreSelect") as HTMLSelectElement;
        const maxScore = parseInt(maxScoreSelect?.value || '5');

        if (!name || name === '') name = `${gameType.value.charAt(0).toUpperCase() + gameType.value.slice(1)} de ${currentPlayerName}`;

        if (name.length < 3) {
            alert('Le nom du lobby doit comporter au moins 3 caractères');
            return;
        }

        if (!/^[a-zA-Z0-9_-\s]+$/.test(name)) {
            alert('Caractères invalides dans le nom du lobby');
            return;
        }

        if (maxPlayers < 2 || maxPlayers > 16) {
            alert('Nombre de joueurs invalide (2-16)');
            return;
        }

        if (!currentPlayerName || currentPlayerName.trim() === '') {
            alert('Veuillez vous connecter avant de créer un lobby');
            navigate('home');
            return;
        }

        if (!wsClient.isConnected()) {
            alert('Connexion perdue, reconnexion en cours...');
            requestLobbyList();
            return;
        }
        
        const type = gameType?.value || 'battleroyale';
        const lobbyType: 'tournament' | 'battleroyale' = 
            type.toLowerCase() === 'tournament' ? 'tournament' : 'battleroyale';

        console.log(`[LOBBY] Création d'un lobby: ${name}, type: ${type}, mode: ${mode}, joueurs: ${maxPlayers}`);

        const powerUpsEnabled = mode.toLowerCase() === 'custom';
        const settings = {
            lifeCount: maxScore,
            powerUpsEnabled: powerUpsEnabled,
            fruitFrequency: powerUpsEnabled ? fruitFrequency : 'normal' as 'low' | 'normal' | 'high'
        };

        const createMessage = {
            type: 'createCustomLobby' as const,
            playerName: currentPlayerName,
            name: name,
            lobbyType: lobbyType,
            maxPlayers: maxPlayers,
            settings: settings
        };
        wsClient.setPendingAction(() => wsClient.sendMessage(createMessage));
        wsClient.sendMessage(createMessage);

        hide(createLobbyModal);
        form.reset();
    });
}

function setupLobbyModal(lobby: Lobby) {
    const lobbyModal = getEl("lobbyModal");
    const modalTitle = getEl('roomName') as HTMLHeadingElement;
    const playersList = getEl('playersList') as HTMLDivElement;
    const playerCount = getEl('modalPlayerCount') as HTMLSpanElement;
    const startButton = getEl('startGame') as HTMLButtonElement;
    const quitButton = getEl('quitRoom') as HTMLButtonElement;
    const typeIcon = lobby.type === 'tournament' ? '🏆' : '⚔️';
    const creator = lobby.players.find(p => p.id === lobby.creatorId);
    const isOwner = creator?.name === currentPlayerName;
    const isFull = lobby.players.length >= lobby.maxPlayers;

    currentOpenLobbyId = lobby.id;

    if (!lobby.players.length) deleteLobby(lobby.id);

    if (modalTitle) modalTitle.textContent = `${typeIcon} ${lobby.name}`;

    if (playerCount) playerCount.textContent = `${lobby.players.length}/${lobby.maxPlayers} joueurs`;

    if (playersList) {
        playersList.innerHTML = '';

        lobby.players.forEach(player => {
            const playerDiv = createPlayerElement(player, lobby);
            playersList.appendChild(playerDiv);
        });
        if (!isFull && isOwner)
            addBot(lobby, playersList);
    }

    if (isOwner && lobby.players.length >= 2) {
        show(startButton);
        startButton.onclick = () => startLobby(lobby.id);
    } else {
        hide(startButton);
        startButton.onclick = null;
    }

    quitButton.onclick = () => {
        wsClient.sendMessage({
            type: 'leaveLobby',
            lobbyId: lobby.id
        });
        currentOpenLobbyId = null;
        hide(lobbyModal);
    };

    show(lobbyModal);
}

function createLobbyElement(lobby: Lobby): HTMLDivElement {
    const lobbyDiv = document.createElement('div');
    lobbyDiv.id = `lobby-${lobby.id}`;
    lobbyDiv.className = `bg-sonpi16-orange bg-opacity-10 rounded-lg p-4 
                        hover:bg-opacity-20 transition-all duration-300 
                        border-2 border-transparent hover:border-sonpi16-orange`;

    const type = lobby.type === 'tournament' ? 'Tournoi ' : 'Battle Royale ';
    const typeIcon = lobby.type === 'tournament' ? '🏆' : '👑';
    const modeIcon = lobby.settings.powerUpsEnabled ? '⚡' : '🎯';
    const isFull = lobby.players.length >= lobby.maxPlayers;

    lobbyDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-sonpi16-orange font-quency mb-2">
                        <span>${typeIcon}</span>
                            ${lobby.name}
                    </h3>
                    <div class="flex gap-4 text-sm text-sonpi16-orange opacity-80">
                        <span class="flex items-center gap-1">
                        <span class="text-lg"> ${modeIcon}</span>
                            ${type}${lobby.settings.powerUpsEnabled ? 'avec PowerUps' : 'sans PowerUps'}</span>
                        <span class="flex items-center gap-1">
                        <span class="text-lg">👥</span>
                        <span id="player-count">
                            ${lobby.players.length}/${lobby.maxPlayers}
                        </span>
                     </span>
                    </div>
                </div>
            
                <div class="flex gap-2">
                    <button 
                        class="joinLobby bg-sonpi16-orange text-sonpi16-black px-4 py-2 rounded-lg 
                                font-bold hover:bg-opacity-90 transition-all font-quency
                                ${isFull ? 'opacity-50 cursor-not-allowed' : ''}">
                            ${isFull ? 'Complet' : 'Rejoindre'}
                    </button>
                </div>
            </div>`;

    return lobbyDiv;
}

function createPlayerElement(player: LobbyPlayer, lobby: Lobby): HTMLDivElement 
{
    const playerDiv = document.createElement('div');

    playerDiv.id = player.id;
    playerDiv.className = `flex flex-row gap-12 items-center 
                            border-sonpi16-black rounded-xl 
                            bg-sonpi16-orange bg-opacity-30 w-full`

    const isOwner = player.id === lobby.creatorId;
    const ownerStar = isOwner ? ' ⭐' : '';
    
    const creator = lobby.players.find(p => p.id === lobby.creatorId);
    const amICreator = creator?.name === currentPlayerName;
    const showKickButton = amICreator && !isOwner;


    playerDiv.innerHTML = `
            <img src="./assets/Transcendaire.png" alt="avatar" class="w-16 h-16 rounded-full object-cover">
            <span id="${player.id}" class="font-quency text-sonpi16-orange text-2lg">${player.name}${ownerStar}</span>
            ${showKickButton ? 
            `<button data-player-id="${player.id}" 
                     class="kickButton w-10 h-10
                            hover:scale-110 transition-all duration-200 
                            flex items-center justify-center
                            text-sonpi16-orange text-xl font-bold shadow-lg">
                ✕
             </button>` 
            : ''
            }`;

    const kickBtn = playerDiv.querySelector('.kickButton') as HTMLButtonElement | null;
    if (kickBtn) {
        kickBtn.addEventListener('click', () => {
            if (!wsClient.isConnected()) {
                alert('Connexion perdue, reconnexion en cours...');
                requestLobbyList();
                return;
            }
            const targetPlayerId = kickBtn.getAttribute('data-player-id');
            if (targetPlayerId) {
                wsClient.sendMessage({
                    type: 'removeBot',
                    lobbyId: lobby.id,
                    botId: targetPlayerId
                });
            }
        });
    }
    
    return playerDiv;
}

function addBot(lobby: Lobby, playersList: HTMLDivElement) {
    const addBotDiv = document.createElement('div');


    addBotDiv.className = `flex flex-row gap-12 items-center 
                            border-sonpi16-black rounded-xl
                            w-16 h-16 justify-center
                            bg-sonpi16-orange bg-opacity-30 w-full corder 
                            border-4 border-dashed border-sonpi16-orange
                            text-sonpi16-orange`

    addBotDiv.innerHTML = `
            <span class="font-quency m">Add Bot</span>
            <button id="addBotButton" 
                class="w-12 h-12 hover:scale-110 transition-all duration-200 items-center font-quency
                   text-sonpi16-orange text-4xl font-bold">
                    +
            </button>
            `;



    playersList.appendChild(addBotDiv);
    getEl("addBotButton").onclick = () => {
        const botNumber = lobby.players.filter(p => p.isBot).length;
        const robotEmojis = ['🤖', '🦾', '🦿', '👾', '🛸', '⚙️', '🔧'];
        const botName = `Robot${botNumber + 1}${robotEmojis[botNumber % robotEmojis.length]} `;
        const bot: LobbyPlayer = {
            id: `robot-${Date.now()}`,
            name: `${botName}`,
            isBot: true,
            isReady: true
        }
        console.log(`bot added => ${botName}`);
        wsClient.sendMessage({
            type: 'addBot',
            lobbyId: lobby.id
        })
    };

}

registerPageInitializer("lobby", initLobby);