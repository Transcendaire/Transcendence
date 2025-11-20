                    
                    // html a utiliser 
                    // <div class="bg-sonpi16-orange bg-opacity-10 rounded-lg p-4 
                    //             hover:bg-opacity-20 transition-all duration-300 
                    //             border-2 border-transparent hover:border-sonpi16-orange">
                    //     </div>
                    // </div>

import {navigate , registerPageInitializer} from "../router.js"
import { wsClient } from "../components/WebSocketClient.js";
import { getEl , show, hide, setupGlobalModalEvents } from "../app.js";
import { playerName } from "./home.js";
import { Lobby } from "/dist/shared/types.js";

let currentLobbies: Lobby[] = [];
let myPlayerId: string | null = null;

function initLobby()
{
    console.log('[LOBBY] Initialisation de la page lobby');
    const createLobbyModal = getEl("createLobbyModal");
    // const backButton = getEl("backButton");

    getEl("backHome").addEventListener('click', () => navigate("home"));

    setupWebSocketCallbacks();
    initCreationModal(createLobbyModal);
    initLobbyModal();
    requestLobbyList();

    // backButton.addEventListener('click', () => {
    //     navigate('home');
    // });
}

function setupWebSocketCallbacks(): void
{
    console.log('[LOBBY] Configuration des callbacks WebSocket');
    
    wsClient.onLobbyCreated = (lobbyId: string, lobby: Lobby) => {
        console.log('[LOBBY] Lobby créé:', lobbyId, lobby);
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
    
    wsClient.onGameStart = (playerRole: 'player1' | 'player2') => {
        console.log(`[LOBBY] Match de tournoi démarre! Rôle: ${playerRole}`);
        sessionStorage.setItem('playerRole', playerRole);
        navigate('game');
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
        const lobbyDiv = document.createElement('div');
        lobbyDiv.id = `lobby-${lobby.id}`;
        lobbyDiv.className = `bg-sonpi16-orange bg-opacity-10 rounded-lg p-4 
                              hover:bg-opacity-20 transition-all duration-300 
                              border-2 border-transparent hover:border-sonpi16-orange`;
        
        const typeIcon = lobby.type === 'tournament' ? '🏆' : '⚔️';
        const modeIcon = lobby.settings.powerUpsEnabled ? '⚡' : '🎮';
        const isFull = lobby.players.length >= lobby.maxPlayers;
        
        const creator = lobby.players.find(p => p.id === lobby.creatorId);
        const isOwner = creator?.name === playerName;
        
        lobbyDiv.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-sonpi16-orange font-quency mb-2 flex items-center gap-2">
                        <span>${typeIcon}</span>
                        ${lobby.name}
                        ${creator ? `<span class="text-xs opacity-60">(by ${creator.name})</span>` : ''}
                    </h3>
                    <div class="flex gap-4 text-sm text-sonpi16-orange opacity-80">
                        <span class="flex items-center gap-1">
                            <span class="text-lg">${modeIcon}</span>
                            ${lobby.settings.powerUpsEnabled ? 'Custom' : 'Normal'}
                        </span>
                        <span class="flex items-center gap-1">
                            <span class="text-lg">👥</span>
                            ${lobby.players.length}/${lobby.maxPlayers}
                        </span>
                        <span class="flex items-center gap-1">
                            <span class="text-lg">🎯</span>
                            ${lobby.settings.maxScore} pts
                        </span>
                    </div>
                </div>
                
                <div class="flex gap-2">
                    ${!isOwner ? `
                        <button 
                            class="joinLobbyButton bg-sonpi16-orange text-sonpi16-black px-4 py-2 rounded-lg 
                                   font-bold hover:bg-opacity-90 transition-all font-quency
                                   ${isFull ? 'opacity-50 cursor-not-allowed' : ''}"
                            data-lobby-id="${lobby.id}"
                            ${isFull ? 'disabled' : ''}>
                            Rejoindre
                        </button>
                    ` : `
                        <button 
                            class="startLobbyButton bg-green-600 text-white px-4 py-2 rounded-lg 
                                   font-bold hover:bg-green-700 transition-all font-quency
                                   ${lobby.players.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}"
                            data-lobby-id="${lobby.id}"
                            ${lobby.players.length < 2 ? 'disabled' : ''}>
                            🚀 Lancer
                        </button>
                        <button 
                            class="deleteLobbyButton bg-red-600 text-white px-4 py-2 rounded-lg 
                                   font-bold hover:bg-red-700 transition-all font-quency"
                            data-lobby-id="${lobby.id}">
                            🗑️ Supprimer
                        </button>
                    `}
                </div>
            </div>
        `;
        
        const joinButton = lobbyDiv.querySelector('.joinLobbyButton') as HTMLButtonElement;
        if (joinButton && !isFull) {
            joinButton.addEventListener('click', () => {
                joinLobby(lobby.id);
            });
        }
        
        const startButton = lobbyDiv.querySelector('.startLobbyButton') as HTMLButtonElement;
        if (startButton) {
            startButton.addEventListener('click', () => {
                startLobby(lobby.id);
            });
        }
        
        const deleteButton = lobbyDiv.querySelector('.deleteLobbyButton') as HTMLButtonElement;
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                deleteLobby(lobby.id);
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
    const gameType = getEl("gameType") as HTMLSelectElement;
    const gameMode = getEl("gameMode") as HTMLSelectElement;
    const nbPlayer = getEl("nbPlayer") as HTMLSelectElement;
    const createLobbyButton = getEl('createLobbyButton') as HTMLButtonElement;
    const cancelCreateButton = getEl('cancelCreateButton') as HTMLButtonElement;
    const form = getEl('creationForm') as HTMLFormElement;
    
    setupGlobalModalEvents(createLobbyModal, createLobbyButton, cancelCreateButton);

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = tournamentName.value.trim();
        
        const gameModeLabel = getEl("gameMode");
        const gameModeSelect = gameModeLabel.nextElementSibling as HTMLSelectElement;
        const mode = gameModeSelect?.value || 'Normal';
        
        const nbPlayerLabel = getEl("nbPlayer");
        const nbPlayerSelect = nbPlayerLabel.nextElementSibling as HTMLSelectElement;
        const maxPlayers = parseInt(nbPlayerSelect?.value || '2');
        
        if (!name || name === '') {
            alert('Veuillez entrer un nom de lobby');
            return;
        }
        
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
        
        const type = gameType?.value || 'MultiplayerGame';
        const lobbyType: 'tournament' | 'multiplayergame' = 
            type === 'Tournament' ? 'tournament' : 'multiplayergame';

        console.log(`[LOBBY] Création d'un lobby: ${name}, type: ${type}, mode: ${mode}, joueurs: ${maxPlayers}`);
        
        const settings = {
            maxScore: 5,
            powerUpsEnabled: mode.toLowerCase() === 'custom',
            fruitFrequency: 'normal' as 'low' | 'normal' | 'high'
        };
        
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

function initLobbyModal()
{
    const lobbyList = getEl("lobbiesList");

    lobbyList.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;

        if (target.classList.contains('joinTournament')) {
            const lobbyModal = getEl('lobbyModal');
            show(lobbyModal);
        }
    });
}

// function addPlayerElement()
// {
//     const PlayerDiv = document.createElement('div');

//     PlayerDiv.id = playerName.id;
// }

// function createLobbyElement()
// {
//            if (!name || name.trim() === '') {
//             alert('Veuillez entrer un nom de tournoi');
//             return;
//         }
        
//         if (maxPlayers < 2 || maxPlayers > 16) {
//             alert('Nombre de joueurs invalide');
//             return;
//         }
//         const lobbyList = getEl("lobbiesList");

//         if (!lobbyList) {
//             console.error('[LOBBY] lobbyList non trouvé!');
//             return;
//         }
//         console.log(` test mode = ${mode === 'Custom' ? 'Custom' : 'Normal'}`);
    
//         const tournamentDiv = document.createElement('div');
//         tournamentDiv.id = `tournament`;
//         tournamentDiv.className = `bg-sonpi16-orange bg-opacity-10 rounded-lg p-4 
//                                hover:bg-opacity-20 transition-all duration-300 
//                                border-2 border-transparent hover:border-sonpi16-orange`;
//         tournamentDiv.innerHTML = `
//                 <div class="flex items-center justify-between">
//                 <!-- Infos tournoi -->
//                 <div class="flex-1">
//                 <h3 class="text-xl font-bold text-sonpi16-orange font-quency mb-2">
//                     ${name}
//                 </h3>
//                 <div class="flex gap-4 text-sm text-sonpi16-orange opacity-80">
//                     <span class="flex items-center gap-1">
//                         <span class="text-lg"> ${type === 'Tournament' ? '🏆' : '⚔️'}${mode === 'Custom' ? '⚡' : '🏓'}</span>
//                         ${type === 'Tournament' ? 'Tournoi ' : 'Partie ' }${mode === 'Custom' ? 'Custom' : 'Normal'}
//                     </span>
//                     <span class="flex items-center gap-1">
//                         <span class="text-lg">👥</span>
//                         <span id="player-count">
//                             ${currentPlayers}/${maxPlayers}
//                         </span>
//                     </span>
//                 </div>
//             </div>
            
//             <div class="flex gap-2">
//                 <button 
//                     class="joinTournament bg-sonpi16-orange text-sonpi16-black px-4 py-2 rounded-lg 
//                            font-bold hover:bg-opacity-90 transition-all font-quency
//                            ${currentPlayers >= maxPlayers ? 'opacity-50 cursor-not-allowed' : ''}"
//                     ${currentPlayers >= maxPlayers ? 'disabled' : ''}>
//                     Rejoindre
//                 </button>
//             </div>
//         </div>
//     `;
// }

registerPageInitializer("lobby", initLobby);