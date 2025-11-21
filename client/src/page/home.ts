import { registerPageInitializer, navigate } from "../router.js";
import { inputParserClass } from "../components/inputParser.js";
import { wsClient } from "../components/WebSocketClient.js";
import { getEl , show, hide, setupGlobalModalEvents } from "../app.js";

export let isLoggedIn: boolean = false;
export let playerName: string = "";
const inputParser = new inputParserClass();

function initHomePage(): void
{
    const gameModeModal = getEl("gameModeModal");
    const loginModal = getEl("loginModal");
    const signinModal = getEl("signinModal");
    const waitingModal = getEl("waitingModal");
    const playButton = getEl("playButton") as HTMLButtonElement;
    const redirect = getEl("signinRedirect") as HTMLButtonElement;

    console.log(`playerName : ${playerName} is loggedIn ${isLoggedIn}`);
    updateUI();

    setupWebsocket(waitingModal);

    getEl("cancelGameModeButton").addEventListener('click', () => hide(gameModeModal));
    getEl("profileButton").addEventListener('click', () => navigate("profile"));
    getEl("logoutButton").addEventListener('click', () => {
        isLoggedIn = false;
        playerName = "";
        updateUI();
    });

    playButton.addEventListener('click', () => {
        if (isLoggedIn)
            show(gameModeModal);
        else
            show(loginModal);
    });
    
    redirect.addEventListener('click', () => {
        hide(loginModal);
        show(signinModal);
    })

    initWaitingModal(waitingModal);
    initLoginModal(loginModal);
    initsigninModal(signinModal);
    initGameModeModal(gameModeModal);
}

function initLoginModal(loginModal: HTMLElement)
{
    const loginButton = getEl("loginButton") as HTMLButtonElement;
    const checkButton = getEl("checkInput") as HTMLButtonElement;
    const cancelLoginButton = getEl("cancelLoginButton") as HTMLButtonElement;
    const playerInput = getEl("usernameCheck") as HTMLInputElement;
    const passwordInput = getEl("passwordCheck") as HTMLInputElement;

    setupGlobalModalEvents(loginModal, loginButton, cancelLoginButton);
    loginButton.addEventListener('click', () => console.log('bouton login cliquer'));


    const connect = () => 
    {
        const username = playerInput.value;
        const password = passwordInput.value;
        
        console.log(`username = ${username}`)
        if (inputParser.parsePlayerName(username) === false) 
            alert(`${username} n'est pas un nom valide`);
        else 
        {
            playerName = username;
            isLoggedIn = true;
            hide(loginModal)
            updateUI();
        }
    }

    checkButton.addEventListener('click', connect);
    checkButton.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') connect
    });
}

function initsigninModal(signinModal: HTMLElement)
{
    const signinButton = getEl("signinButton") as HTMLButtonElement;
    const cancelSigninButton = getEl("cancelSigninButton") as HTMLButtonElement
    const usernameInput = getEl("newUser") as HTMLInputElement;
    const aliasInput = getEl("newAlias") as HTMLInputElement;
    const passwordInput = getEl("createPassword") as HTMLInputElement;
    const confirmPasswordInput = getEl("passwordConfirmation") as HTMLInputElement;
    const checkSignInInput = getEl("checkSignInInput") as HTMLButtonElement;

    setupGlobalModalEvents(signinModal, signinButton, cancelSigninButton);
    signinButton.addEventListener('click', () => console.log('bouton sign in cliquer'));


    const subscribe = () => {

        const username = usernameInput.value;
        const alias = aliasInput.value;
        const password = (passwordInput.value === confirmPasswordInput.value ? passwordInput.value : "");

        if (inputParser.parsePlayerName(username) === false) 
            alert(`${username} n'est pas un nom valide`);
    }

    checkSignInInput.onclick = subscribe;
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


    const tournamentButton = getEl("tournamentButton");
    tournamentButton.addEventListener('click' , () => {
        hide(gameModeModal);
        navigate('lobby');
    });
}

function initWaitingModal(modal: HTMLElement)
{
    const cancelWaitButton = getEl("cancelWaitButton");

    cancelWaitButton.addEventListener('click', () => {
        wsClient.disconnect();
        hide(modal);
    });
}
function updateUI(): void {
    const loginButton = getEl("loginButton");
    const logoutButton = getEl("logoutButton");
    const profileButton = getEl("profileButton");
    const signinButton = getEl("signinButton");
    
    if (isLoggedIn) {
        hide(loginButton);
        hide(signinButton);
        show(logoutButton);
        show(profileButton);
        console.log('[HOME] UI: Connecté');
    } else {
        show(loginButton);
        show(signinButton);
        hide(profileButton);
        hide(logoutButton);
        console.log('[HOME] UI: Non connecté');
    }
}

function setupWebsocket(waitingModal: HTMLElement)
{
    wsClient.onWaitingForPlayer = () => 
    {
        console.log('waiting for player')
        show(waitingModal);
    }

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

registerPageInitializer('home', initHomePage);