import { registerPageInitializer, navigate } from "../router.js";
// import { inputParserClass } from "../components/inputParser.js";
import { inputParserClass } from "../../../shared/src/inputParser.js";
import { wsClient } from "../components/WebSocketClient.js";
import { getPlayerName, getEl , show, hide, setupGlobalModalEvents } from "../app.js";
// import { checkIfPlayerIsInAnotherTournament } from "src/components/data.js";
import { checkIfPlayerNameAlreadyTaken } from "../components/data.js";

export let isLoggedIn: boolean = false;
export let playerName: string | undefined;
const inputParser = new inputParserClass();


//*
async function initHomePage()
{
    const gameModeModal = getEl("gameModeModal");
    const loginModal = getEl("loginModal");
    const waitingModal = getEl("waitingModal");
    const playButton = getEl("playButton") as HTMLButtonElement;

	playerName = await getPlayerName();
	(playerName === undefined) ? isLoggedIn = false : isLoggedIn = true;

    console.log(`playerName : ${playerName} is loggedIn ${isLoggedIn}`);
    updateUI();

    setupWebsocket(waitingModal);

    getEl("cancelGameModeButton").addEventListener('click', () => hide(gameModeModal));
    getEl("profileButton").addEventListener('click', () => navigate("profile"));
    getEl("logoutButton").addEventListener('click', () => {
        isLoggedIn = false;
		//toDo add route to remove player's cookie by adding an expiration date as Date.now() (nd remove inside database)
        updateUI();
    });

    playButton.addEventListener('click', () => {
        if (isLoggedIn)
            show(gameModeModal);
        else
            show(loginModal);
    });

    initWaitingModal(waitingModal);
    initLoginModal(loginModal);
    initGameModeModal(gameModeModal);
}

function initLoginModal(loginModal: HTMLElement)
{
    const LoginButton = getEl("loginButton") as HTMLButtonElement;
    const cancelLoginButton = getEl("cancelLoginButton") as HTMLButtonElement;

    setupGlobalModalEvents(loginModal, LoginButton, cancelLoginButton);

    const connectAsInvite = async () => 
    {
        const playerInput = getPlayerName();
        
        console.log(`playerInput = ${playerInput}`)
		try {
			const inputPlayerName = getPlayerNameFromInput()
			inputParser.parsePlayerName(inputPlayerName);
			checkIfPlayerNameAlreadyTaken(inputPlayerName);
			const response = await fetch('/api/players', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					playerName: inputPlayerName
				})
			});
			const data = await response.json();
			if (!response.ok)
			{
				alert(data.error || 'Impossible de créer le joueur');
				return ;
			}
			hide(loginModal);
			updateUI();
		} catch (error) {
			const message = String(error);
			alert(message);
		}
        // if (inputParser.parsePlayerName(playerInput) === false) 
        //     alert(`${playerInput} n'est pas un nom valide`);
		
        // else 
        // {
        //     playerName = playerInput;
        //     isLoggedIn = true;
        //     hide(loginModal)
        //     updateUI();
        // }
    }

    const ckeckInput = getEl("checkPlayerNameInput");
    ckeckInput.addEventListener('click', connectAsInvite);
    ckeckInput.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter') connectAsInvite()
    });
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
			const playerName = await getPlayerName();          
            wsClient.joinGame(playerName!);
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    }

    const joinAI =  async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);
			const playerName = await getPlayerName();
			wsClient.joinAIGame(playerName!);
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    }

    const joinCustom = async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);
			const playerName = await getPlayerName();                     
            wsClient.joinCustomGame(playerName!);
        } catch (error) {
            alert("Impossible de se connecter au serveur");
        }
    }

    const joinAICustom =  async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`);
			const playerName = await getPlayerName();          
            wsClient.joinCustomAIGame(playerName!);
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

function getPlayerNameFromInput(): string {
    return (document.getElementById("playerNameInput") as HTMLInputElement).value;
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