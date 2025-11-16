import { registerPageInitializer, navigate } from "../router.js";
import { inputParserClass } from "../components/inputParser.js";
import { wsClient } from "../components/WebSocketClient.js";
import { getEl } from "../app.js";

export let isLoggedIn: boolean = false;
export let playerName: string = "";
const inputParser = new inputParserClass();

function initHomePage(): void
{
    const gameModeModal = getEl("gameModeModal");
    const loginModal = getEl("loginModal");
    const playButton = getEl("playButton");
    
    getEl("loginButton").addEventListener('click', () => show(loginModal));
    getEl("cancelLoginButton").addEventListener('click', () => hide(loginModal));
    getEl("cancelGameModeButton").addEventListener('click', () => hide(gameModeModal));
    getEl("profileButton").addEventListener('click', () => navigate("profile"));
    getEl("logoutButton").addEventListener('cick', () => {
        isLoggedIn = false;
        updateUI();
    });

    playButton.addEventListener('click', () => {
        if (isLoggedIn)
            show(gameModeModal);
        else
            show(loginModal);
    });

    initLoginModal(loginModal);
    initGameModeModal(gameModeModal);
}

function initLoginModal(loginModal: HTMLElement)
{

    loginModal.addEventListener('click', (event) => {
        if (event.target === loginModal) {
            console.log('[HOME] Fermeture du modal (clic extérieur)');
            show(loginModal);
        }
    });

    getEl("checkPlayerNameInput").addEventListener('click', () => 
    {
        const playerInput = getPlayerName();

        console.log(`playerInput = ${playerInput}`)
        if (inputParser.parsePlayerName(playerInput) === false) 
            alert(`${playerInput} n'est pas un nom valide`);
        else 
        {
            playerName = playerInput;
            isLoggedIn = true;
            hide(loginModal)
            updateUI();
        }
    });
}

function initGameModeModal(gameModeModal: HTMLElement)
{
    gameModeModal.addEventListener('click', (event) => {
        if (event.target === gameModeModal) {
            hide(gameModeModal);
        }
    });

    getEl("joinGameButton").addEventListener('click', async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);            
            wsClient.joinGame(playerName);
            navigate('game');
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    });

    getEl("joinAIButton").addEventListener('click', async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);
            wsClient.joinAIGame(playerName);
            navigate('game');
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    });
}

function updateUI(): void {
    const loginButton = getEl("loginButton");
    const logoutButton = getEl("logoutButton");
    const profileButton = getEl("profileButton");
    
    if (isLoggedIn) {
        hide(loginButton);
        show(logoutButton);
        show(profileButton);
        console.log('[HOME] UI: Connecté');
    } else {
        hide(profileButton);
        show(loginButton);
        hide(logoutButton);
        console.log('[HOME] UI: Non connecté');
    }
}

function getPlayerName(): string {
    return (document.getElementById("playerNameInput") as HTMLInputElement).value;
}

function show(element: HTMLElement): void {
    element.classList.remove('hidden');
}

function hide(element: HTMLElement): void {
    element.classList.add('hidden');
}

registerPageInitializer('home', initHomePage);