import { registerPageInitializer, navigate } from "../router.js";
import { inputParserClass } from "../components/inputParser.js";
import { wsClient } from "../components/WebSocketClient.js";
import { getEl } from "../app.js";

export let isLoggedIn: boolean = false;
export let playerName: string = "";
const inputParser = new inputParserClass();

function initHomePage(): void
{
    const gameModeModal = getEl("gameModeModal") as HTMLDivElement;
    const loginModal = getEl("loginModal") as HTMLDivElement;
    const playButton = getEl("playButton") as HTMLButtonElement;

    console.log(`playerName : ${playerName} is loggedIn ${isLoggedIn}`);
    updateUI();
    
    getEl("loginButton").addEventListener('click', () => show(loginModal));
    getEl("cancelLoginButton").addEventListener('click', () => hide(loginModal));
    getEl("cancelGameModeButton").addEventListener('click', () => hide(gameModeModal));
    getEl("profileButton").addEventListener('click', () => navigate("profile"));
    getEl("logoutButton").addEventListener('click', () => {
        isLoggedIn = false;
        updateUI();
    });

    playButton.addEventListener('click', () => {
        if (isLoggedIn)
            show(gameModeModal);
        else
            show(loginModal);
    });


    setupGlobalEvents(loginModal, gameModeModal);

    initLoginModal(loginModal);
    initGameModeModal(gameModeModal);
}

function initLoginModal(loginModal: HTMLElement)
{

    loginModal.addEventListener('click', (event) => {
        if (event.target === loginModal)
            show(loginModal);
    });

    const connectAsInvite = () => 
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
    }

    getEl("checkPlayerNameInput").addEventListener('click', connectAsInvite);
    getEl("checkPlayerNameInput").addEventListener('keydown', (event: KeyboardEvent) => connectAsInvite);

}

function initGameModeModal(gameModeModal: HTMLElement)
{
    gameModeModal.addEventListener('click', (event) => {
        if (event.target === gameModeModal) {
            hide(gameModeModal);
        }
    });

    const join1v1 = async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);            
            wsClient.joinGame(playerName);
            navigate('game');
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    }

    const joinAI =  async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);
            wsClient.joinAIGame(playerName);
            navigate('game');
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    }

    getEl("joinGameButton").addEventListener('click', join1v1);
    getEl("joinAIButton").addEventListener('click', joinAI);
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

function setupGlobalEvents(loginModal: HTMLDivElement, gameModeModal: HTMLDivElement){

    document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
        if (!loginModal.classList.contains('hidden')) {
            hide(loginModal);
        }
        if (!gameModeModal.classList.contains('hidden')) {
            hide(gameModeModal);
        }
    }
    });
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