                    
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

let name : string;
let type : string;
let mode : string;
let maxPlayers : number;
let currentPlayers : number;

function initLobby()
{
    const createLobbyModal = getEl("createLobbyModal");

    getEl("backHome").addEventListener('click', () => navigate("home"));

    initCreationModal(createLobbyModal);
    initLobbyModal();
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
    
    setupGlobalModalEvents(createLobbyModal ,createLobbyButton, cancelCreateButton);

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        name = tournamentName.value;
        type = gameType.value;
        mode = gameMode.value;
        maxPlayers = parseInt(nbPlayer.value);
        currentPlayers = 0;
        
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
        console.log(` test mode = ${mode === 'Custom' ? 'Custom' : 'Normal'}`);
    
        const tournamentDiv = document.createElement('div');
        tournamentDiv.id = `tournament`;
        tournamentDiv.className = `bg-sonpi16-orange bg-opacity-10 rounded-lg p-4 
                               hover:bg-opacity-20 transition-all duration-300 
                               border-2 border-transparent hover:border-sonpi16-orange`;
        tournamentDiv.innerHTML = `
                <div class="flex items-center justify-between">
                <div class="flex-1">
                <h3 class="text-xl font-bold text-sonpi16-orange font-quency mb-2">
                    ${type === 'Tournament' ? '🏆' : '⚔️'}${name}
                </h3>
                <div class="flex gap-4 text-sm text-sonpi16-orange opacity-80">
                    <span class="flex items-center gap-1">
                        <span class="text-lg"> ${mode === 'Custom' ? '⚡' : '🏓'}</span>
                        ${type === 'Tournament' ? 'Tournoi ' : 'Partie ' }${mode === 'Custom' ? 'Custom' : 'Normal'}
                    </span>
                    <span class="flex items-center gap-1">
                        <span class="text-lg">👥</span>
                        <span id="player-count">
                            ${currentPlayers}/${maxPlayers}
                        </span>
                    </span>
                </div>
            </div>
            
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

function addPlayerElement()
{
    const PlayerDiv = document.createElement('div');

    PlayerDiv.id = playerName.id;
}

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