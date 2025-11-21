import {navigate , registerPageInitializer} from "../router.js"
import { wsClient } from "../components/WebSocketClient.js";
import { getEl , show, hide, setupGlobalModalEvents } from "../app.js";
import { playerName } from "./home.js";
import { Lobby, LobbyPlayer } from "/dist/shared/types.js";

let currentLobbies: Lobby[] = [];
let myPlayerId: string | null = null;

function initLobby()
{
    console.log('[LOBBY] Initialisation de la page lobby');

    const createLobbyModal = getEl("createLobbyModal");

    getEl("backHome").addEventListener('click', () => navigate("home"));

    setupWebSocketCallbacks();
    initCreationModal(createLobbyModal);
    requestLobbyList();
}

function setupWebSocketCallbacks(): void
{
    console.log('[LOBBY] Configuration des callbacks WebSocket');
    
    wsClient.onLobbyCreated = (lobbyId: string, lobby: Lobby) => {
        console.log('[LOBBY] Lobby créé:', lobbyId, lobby);
        setupLobbyModal(lobby);
        requestLobbyList();
    };

    wsClient.onLobbyUpdate = (lobby: Lobby) => {
        console.log('[LOBBY] Mise à jour du lobby:', lobby);
        requestLobbyList();
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
}

function requestLobbyList(): void
{
    console.log('[LOBBY] Demande de la liste des lobbies');
    if (!wsClient.isConnected()) {
        console.log('[LOBBY] WebSocket non connecté, connexion en cours...');
        wsClient.connect('ws://localhost:8080/ws').then(() => {
            wsClient.sendMessage({ type: 'requestLobbyList' });
        }).catch((error) => {
            console.error('[LOBBY] Erreur de connexion WebSocket:', error);
        });
    } else {
        wsClient.sendMessage({ type: 'requestLobbyList' });
    }
}

function renderLobbies(lobbies: Lobby[]): void
{
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

function joinLobby(lobbyId: string): void
{
    console.log('[LOBBY] Tentative de rejoindre le lobby:', lobbyId);
    
    if (!playerName || playerName.trim() === '') {
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
    
    wsClient.sendMessage({ 
        type: 'joinLobby',
        playerName: playerName,
        lobbyId: lobbyId 
    });
}

function startLobby(lobbyId: string): void
{
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

function deleteLobby(lobbyId: string): void
{
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

function initCreationModal(createLobbyModal: HTMLElement)
{
    const tournamentName = getEl("tournamentName") as HTMLInputElement;
    const createLobbyButton = getEl('createLobbyButton') as HTMLButtonElement;
    const cancelCreateButton = getEl('cancelCreateButton') as HTMLButtonElement;
    const form = getEl('creationForm') as HTMLFormElement;
    
    setupGlobalModalEvents(createLobbyModal, createLobbyButton, cancelCreateButton);

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let name = tournamentName.value.trim();
        
        const gameType = getEl("gameType") as HTMLSelectElement;
        const gameMode = getEl("gameMode") as HTMLSelectElement;
        const mode = gameMode.value;
        const nbPlayer = getEl("nbPlayer") as HTMLSelectElement;
        const maxPlayers = parseInt(nbPlayer?.value || '2');
        
        if (!name || name === '') name = `${gameType.value} de ${playerName}`;
        
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
        
        if (!playerName || playerName.trim() === '') {
            alert('Veuillez vous connecter avant de créer un lobby');
            navigate('home');
            return;
        }
        
        if (!wsClient.isConnected()) {
            alert('Connexion perdue, reconnexion en cours...');
            requestLobbyList();
            return;
        }
        
        const settings = {
            maxScore: 5,
            powerUpsEnabled: mode.toLowerCase() === 'custom',
            fruitFrequency: 'normal' as 'low' | 'normal' | 'high'
        };
        
        const lobbyType: 'tournament' | 'multiplayergame' = maxPlayers > 6 ? 'tournament' : 'multiplayergame';
        
        wsClient.sendMessage({
            type: 'createCustomLobby',
            playerName: playerName,
            name: name,
            lobbyType: lobbyType,
            settings: settings
        });
        
        hide(createLobbyModal);
        form.reset();
    });
}

function setupLobbyModal(lobby: Lobby)
{
    const lobbyModal = getEl("lobbyModal");
    const modalTitle = getEl('roomName') as HTMLHeadingElement;
    const playersList = getEl('playersList') as HTMLDivElement;
    const playerCount = getEl('modalPlayerCount') as HTMLSpanElement;
    const startButton = getEl('startGame') as HTMLButtonElement;
    const quitButton = getEl('quitRoom') as HTMLButtonElement;
    const typeIcon = lobby.type === 'tournament' ? '🏆' : '⚔️';
    const creator = lobby.players.find(p => p.id === lobby.creatorId);
    const isOwner = creator?.name === playerName;

    if (!lobby.players.length) deleteLobby(lobby.id);

    if (modalTitle) modalTitle.textContent = `${typeIcon} ${lobby.name}`;

    if (playerCount) playerCount.textContent = `${lobby.players.length}/${lobby.maxPlayers} joueurs`;

    if (playersList) {
        playersList.innerHTML = '';

        lobby.players.forEach(player => {
            const playerDiv = createPlayerElement(player);
            playersList.appendChild(playerDiv);
        });
    }

    if (isOwner)
    {
        show(startButton);
        startButton.onclick = () => startLobby(lobby.id);
    }

    if (quitButton) {
        quitButton.onclick = () => {
            wsClient.sendMessage({ 
                type: 'leaveLobby', 
                lobbyId: lobby.id 
            });
            hide(lobbyModal);
        };
    }

    show(lobbyModal);
}

function createLobbyElement(lobby : Lobby): HTMLDivElement
{
    const lobbyDiv = document.createElement('div');
    lobbyDiv.id = `lobby-${lobby.id}`;
    lobbyDiv.className = `bg-sonpi16-orange bg-opacity-10 rounded-lg p-4 
                        hover:bg-opacity-20 transition-all duration-300 
                        border-2 border-transparent hover:border-sonpi16-orange`;
        
        const type = lobby.type === 'tournament' ? 'Tournoi ' : 'Partie ';
        const typeIcon = lobby.type === 'tournament' ? '🏆' : '⚔️';
        const modeIcon = lobby.settings.powerUpsEnabled ? '⚡' : '🎮';
        const isFull = lobby.players.length >= lobby.maxPlayers;
        
        lobbyDiv.innerHTML =`
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-sonpi16-orange font-quency mb-2">
                        <span>${typeIcon}</span>
                            ${lobby.name}
                    </h3>
                    <div class="flex gap-4 text-sm text-sonpi16-orange opacity-80">
                        <span class="flex items-center gap-1">
                        <span class="text-lg"> ${modeIcon}</span>
                            ${type}${lobby.settings.powerUpsEnabled ? 'Custom' : 'Normal'}</span>
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

function createPlayerElement(player : LobbyPlayer): HTMLDivElement
{
    const playerDiv = document.createElement('div');

    playerDiv.id = player.id;
    playerDiv.className = `flex flex-row gap-12 items-center 
                            border-sonpi16-black rounded-xl 
                            bg-sonpi16-orange w-full`

    playerDiv.innerHTML = `
            <img src="./assets/Transcendaire.png" alt="avatar" class="w-16 h-16 rounded-full object-cover">
            <span id="${player.id}" class="font-quency m">${player.name}</span>`;
    return playerDiv;
}

registerPageInitializer("lobby", initLobby);