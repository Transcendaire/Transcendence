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


    const connect = async () => 
    {
		console.log('Connect button clicked\n') 	 	
        const password = passwordInput.value;
        const username = playerInput.value;
        
        console.log(`username = ${username}`)
        console.log(`password = ${password}`)

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					login: username,
					password
				})
			});
			const data = await response.json();
			if (!response.ok)
			{
				alert(data.error || 'Erreur lors de la connexion');
				return ;
			}
			isLoggedIn = true;
			hide(loginModal)
			updateUI();

		} catch (error)
		{
			const message = String(error);
			console.error('Erreur (connect): ', message);
			alert(message);
		}
    }

    checkButton.addEventListener('click', connect);
    checkButton.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') connect
    });
}

async function initsigninModal(signinModal: HTMLElement)
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


    const subscribe = async () => {

        const username = usernameInput.value.trim();
        const alias = aliasInput.value.trim();
        const password = passwordInput.value.trim();
		const passwordValidation = confirmPasswordInput.value.trim();


		 console.log('Form values:', { username, alias, password, passwordValidation });
    	 console.log('confirmPasswordInput element:', confirmPasswordInput);
    	 console.log('confirmPasswordInput value raw:', confirmPasswordInput.value);
		try {
			console.log('subscribe button clicked');
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					login: username, 
					password,
					passwordValidation,
					alias
				})
			});

			const data = await response.json();
			if (!response.ok)
			{
				alert(data.error || 'Erreur lors de l\'inscription');
				return ;
			}
			alert(data.message || 'Inscription réussie !');
			playerName = alias;
			isLoggedIn = true;
			hide(signinModal);
			updateUI()
		} catch (error) {
			const message = String(error);
			console.error('Erreur (subscribe): ', message);
			alert(message);
		}
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