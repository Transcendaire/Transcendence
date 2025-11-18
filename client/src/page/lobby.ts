                    
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

function initLobby()
{
    const waitingModal = getEl("waitingModal");
    const createLobbyModal = getEl("createLobbyModal");


    setupLobbyWebsocket(waitingModal);

    waitingModal.addEventListener('click', () => hide(waitingModal));

    initCreationModal(createLobbyModal);
    initGameModeModal();
}

function initGameModeModal()
{
    const gameModeModal = getEl("gameModeModal");

    const join1v1 = async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);            
            wsClient.joinGame(playerName);
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    }

    const joinAI =  async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);
            wsClient.joinAIGame(playerName);
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    }

    const joinCustom = async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);            
            wsClient.joinCustomGame(playerName);
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    }

    const joinAICustom =  async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);
            wsClient.joinCustomAIGame(playerName);
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    }

    getEl("joinGameButton").addEventListener('click', join1v1);
    getEl("joinAIButton").addEventListener('click', joinAI);
    getEl("joinCustomButton").addEventListener('click', joinCustom);
    getEl("joinCustomAIButton").addEventListener('click', joinAICustom);

    const joinTournamentButton = getEl("joinTournamentButton");
    const main = getEl("tournamentContainer");
    joinTournamentButton.addEventListener('click' , () => {
        show(main);
        hide(gameModeModal);
    });

    getEl("cancelGameModeButton").addEventListener('click', () => navigate("home"));
}

function initCreationModal(createLobbyModal: HTMLElement)
{
    const tournamentName = getEl("tournamentName") as HTMLInputElement;
    const gameMode = getEl("gameMode") as HTMLSelectElement;
    const nbPlayer = getEl("nbPlayer") as HTMLSelectElement;
    const createLobbyButton = getEl('createLobbyButton') as HTMLButtonElement;
    const cancelCreateButton = getEl('cancelCreateButton') as HTMLButtonElement;
    const form = getEl('creationForm') as HTMLFormElement;
    
    setupGlobalModalEvents(createLobbyModal ,createLobbyButton, cancelCreateButton);

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = tournamentName.value;
        const mode = gameMode.value;
        const maxPlayers = parseInt(nbPlayer.value);
        const currentPlayers = 0;
        
        if (!name || name.trim() === '') {
            alert('Veuillez entrer un nom de tournoi');
            return;
        }
        
        if (maxPlayers < 2 || maxPlayers > 16) {
            alert('Nombre de joueurs invalide');
            return;
        }
        const lobbyList = getEl("lobbiesList");

        if (!lobbyList) {
            console.error('[LOBBY] lobbyList non trouvé!');
            return;
        }
    
    // Créer la div du tournoi
    const tournamentDiv = document.createElement('div');
    tournamentDiv.id = `tournament`;
    tournamentDiv.className = `bg-sonpi16-orange bg-opacity-10 rounded-lg p-4 
                               hover:bg-opacity-20 transition-all duration-300 
                               border-2 border-transparent hover:border-sonpi16-orange`;
    
    // Contenu HTML du tournoi
    tournamentDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <!-- Infos tournoi -->
            <div class="flex-1">
                <h3 class="text-xl font-bold text-sonpi16-orange font-quency mb-2">
                    ${name}
                </h3>
                <div class="flex gap-4 text-sm text-sonpi16-orange opacity-80">
                    <span class="flex items-center gap-1">
                        <span class="text-lg">${mode === 'custom' ? '⚡' : '🎮'}</span>
                        ${mode === 'custom' ? 'Custom' : 'Normal'}
                    </span>
                    <span class="flex items-center gap-1">
                        <span class="text-lg">👥</span>
                        <span id="player-count">
                            ${currentPlayers}/${maxPlayers}
                        </span>
                    </span>
                </div>
            </div>
            
            <!-- Boutons d'action -->
            <div class="flex gap-2">
                <button 
                    class="joinTournament bg-sonpi16-orange text-sonpi16-black px-4 py-2 rounded-lg 
                           font-bold hover:bg-opacity-90 transition-all font-quency
                           ${currentPlayers >= maxPlayers ? 'opacity-50 cursor-not-allowed' : ''}"
                    ${currentPlayers >= maxPlayers ? 'disabled' : ''}>
                    Rejoindre
                </button>
                <button 
                    class="deleteTournament bg-red-600 text-white px-4 py-2 rounded-lg 
                           font-bold hover:bg-red-700 transition-all font-quency">
                    🗑️
                </button>
            </div>
        </div>
    `;
    
    lobbyList.insertBefore(tournamentDiv, lobbyList.firstChild);

    console.log(`creation du tournoi ${mode} ${name} de ${maxPlayers} joueurs`)
        
    hide(createLobbyModal);
        
    form.reset();
    });
}

function setupLobbyWebsocket(waitingModal: HTMLElement)
{
    wsClient.onWaitingForPlayer = () => show(waitingModal);

    wsClient.onGameStart = (playerRole: 'player1' | 'player2') => {
        console.log(`[HOME] Jeu démarre! Rôle: ${playerRole}`);
        sessionStorage.setItem('playerRole', playerRole);
        hide(waitingModal);
        navigate('game');
    };

    wsClient.onPlayerJoined = (playerCount: number) => {
        const playerCountSpan = getEl("playerCount");
        playerCountSpan.textContent = playerCount.toString();
    };
}

registerPageInitializer("lobby", initLobby);