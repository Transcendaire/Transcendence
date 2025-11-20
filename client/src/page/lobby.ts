                    
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
    const createLobbyModal = getEl("createLobbyModal");

    initCreationModal(createLobbyModal);
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
            </div>
        </div>
    `;
    
    lobbyList.insertBefore(tournamentDiv, lobbyList.firstChild);

    console.log(`creation du tournoi ${mode} ${name} de ${maxPlayers} joueurs`)
        
    hide(createLobbyModal);
        
    form.reset();
    });
}

registerPageInitializer("lobby", initLobby);