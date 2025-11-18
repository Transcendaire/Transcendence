import { registerPageInitializer, navigate } from "../router.js";
import { inputParserClass } from "../components/inputParser.js";
import { getEl , show, hide, setupGlobalModalEvents } from "../app.js";

export let isLoggedIn: boolean = false;
export let playerName: string = "";
const inputParser = new inputParserClass();

function initHomePage(): void
{
    const loginModal = getEl("loginModal") as HTMLDivElement;
    const playButton = getEl("playButton") as HTMLButtonElement;
    const LoginButton = getEl("loginButton") as HTMLButtonElement;
    const cancelLoginButton = getEl("cancelLoginButton") as HTMLButtonElement;

    console.log(`playerName : ${playerName} is loggedIn ${isLoggedIn}`);
    updateUI();

    getEl("profileButton").addEventListener('click', () => navigate("profile"));
    getEl("logoutButton").addEventListener('click', () => {
        isLoggedIn = false;
        playerName = "";
        updateUI();
    });

    playButton.addEventListener('click', () => {
        if (isLoggedIn)
            navigate("lobby");
        else
            show(loginModal);
    });

    initLoginModal(loginModal, LoginButton, cancelLoginButton);
}

function initLoginModal(loginModal: HTMLElement, showButton: HTMLButtonElement, hideButton: HTMLButtonElement)
{
    setupGlobalModalEvents(loginModal, showButton, hideButton);

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
    
    const ckeckInput = getEl("checkPlayerNameInput");
    ckeckInput.addEventListener('click', connectAsInvite);
    ckeckInput.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter') connectAsInvite
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

registerPageInitializer('home', initHomePage);