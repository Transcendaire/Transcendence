import { registerPageInitializer, navigate } from "../router.js";
import { inputParserClass } from "../components/inputParser.js";
import { wsClient } from "../components/WebSocketClient.js";
import { getEl , show, hide, setupGlobalModalEvents } from "../app.js";

export let isLoggedIn: boolean = false;
export let playerName: string = "";
const inputParser = new inputParserClass();

function initHomePage(): void
{
    const gameModeModal = getEl("gameModeModal")
    const fastGameModal = getEl("fastGameModal")
    const aiGameModal = getEl("aiGameModal")
    const loginModal = getEl("loginModal")
    const signinModal = getEl("signinModal")
    const waitingModal = getEl("waitingModal")
    const playButton = getEl("playButton") as HTMLButtonElement
    const redirect = getEl("signinRedirect") as HTMLButtonElement

    console.log(`playerName : ${playerName} is loggedIn ${isLoggedIn}`)
    updateUI()
    setupWebsocket(waitingModal)

    getEl("cancelGameModeButton").addEventListener('click', () => hide(gameModeModal))
    getEl("profileButton").addEventListener('click', () => navigate("profile"))
    getEl("logoutButton").addEventListener('click', () => {
        isLoggedIn = false
        playerName = ""
        updateUI()
    })

    playButton.addEventListener('click', () => {
        if (isLoggedIn)
            show(gameModeModal)
        else
            show(loginModal)
    })
    
    redirect.addEventListener('click', () => {
        hide(loginModal)
        show(signinModal)
    })

    initWaitingModal(waitingModal)
    initLoginModal(loginModal)
    initsigninModal(signinModal)
    initGameModeModal(gameModeModal, fastGameModal, aiGameModal)
    initFastGameModal(fastGameModal, gameModeModal)
    initAIGameModal(aiGameModal, gameModeModal)
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

function initGameModeModal(
    gameModeModal: HTMLElement,
    fastGameModal: HTMLElement,
    aiGameModal: HTMLElement
): void
{
    gameModeModal.addEventListener('click', (event) => {
        if (event.target === gameModeModal)
            hide(gameModeModal)
    })

    getEl("fastGameButton").addEventListener('click', () => {
        hide(gameModeModal)
        show(fastGameModal)
    })

    getEl("aiGameButton").addEventListener('click', () => {
        hide(gameModeModal)
        show(aiGameModal)
    })

    getEl("lobbiesButton").addEventListener('click', () => {
        hide(gameModeModal)
        navigate('lobby')
    })
}

function initFastGameModal(fastGameModal: HTMLElement, gameModeModal: HTMLElement): void
{
    fastGameModal.addEventListener('click', (event) => {
        if (event.target === fastGameModal)
            hide(fastGameModal)
    })

    const join1v1 = async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`)
            wsClient.joinGame(playerName)
        } catch (error) {
            alert("Impossible de se connecter au serveur")
        }
    }

    const joinCustom = async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`)
            wsClient.joinCustomGame(playerName)
        } catch (error) {
            alert("Impossible de se connecter au serveur")
        }
    }

    getEl("joinGameButton").addEventListener('click', join1v1)
    getEl("joinCustomButton").addEventListener('click', joinCustom)
    getEl("cancelFastGameButton").addEventListener('click', () => {
        hide(fastGameModal)
        show(gameModeModal)
    })
}

function initAIGameModal(aiGameModal: HTMLElement, gameModeModal: HTMLElement): void
{
    let selectedDifficulty = 0
    let selectedPowerUps = true
    let selectedMaxScore = 5

    aiGameModal.addEventListener('click', (event) => {
        if (event.target === aiGameModal)
            hide(aiGameModal)
    })

    const diffEasyBtn = getEl("difficultyEasyButton") as HTMLButtonElement
    const diffNormalBtn = getEl("difficultyNormalButton") as HTMLButtonElement
    const powerOnBtn = getEl("powerUpsOnButton") as HTMLButtonElement
    const powerOffBtn = getEl("powerUpsOffButton") as HTMLButtonElement
    const maxScore3Btn = getEl("maxScore3Button") as HTMLButtonElement
    const maxScore5Btn = getEl("maxScore5Button") as HTMLButtonElement
    const maxScore7Btn = getEl("maxScore7Button") as HTMLButtonElement
    const maxScore11Btn = getEl("maxScore11Button") as HTMLButtonElement
    const maxScore21Btn = getEl("maxScore21Button") as HTMLButtonElement

    const updateDifficultyUI = () => {
        if (selectedDifficulty === 0)
        {
            diffEasyBtn.className = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-sonpi16-orange text-sonpi16-black border-4 border-white transition-all duration-300"
            diffNormalBtn.className = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-gray-600 text-gray-300 border-4 border-transparent transition-all duration-300 hover:bg-gray-500"
        }
        else
        {
            diffEasyBtn.className = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-gray-600 text-gray-300 border-4 border-transparent transition-all duration-300 hover:bg-gray-500"
            diffNormalBtn.className = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-sonpi16-orange text-sonpi16-black border-4 border-white transition-all duration-300"
        }
    }

    const updatePowerUpsUI = () => {
        if (selectedPowerUps)
        {
            powerOnBtn.className = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-sonpi16-orange text-sonpi16-black border-4 border-white transition-all duration-300"
            powerOffBtn.className = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-gray-600 text-gray-300 border-4 border-transparent transition-all duration-300 hover:bg-gray-500"
        }
        else
        {
            powerOnBtn.className = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-gray-600 text-gray-300 border-4 border-transparent transition-all duration-300 hover:bg-gray-500"
            powerOffBtn.className = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-sonpi16-orange text-sonpi16-black border-4 border-white transition-all duration-300"
        }
    }

    const updateMaxScoreUI = () => {
        const activeClass = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-sonpi16-orange text-sonpi16-black border-4 border-white transition-all duration-300"
        const inactiveClass = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-gray-600 text-gray-300 border-4 border-transparent transition-all duration-300 hover:bg-gray-500"
        maxScore3Btn.className = selectedMaxScore === 3 ? activeClass : inactiveClass
        maxScore5Btn.className = selectedMaxScore === 5 ? activeClass : inactiveClass
        maxScore7Btn.className = selectedMaxScore === 7 ? activeClass : inactiveClass
        maxScore11Btn.className = selectedMaxScore === 11 ? activeClass : inactiveClass
        maxScore21Btn.className = selectedMaxScore === 21 ? activeClass : inactiveClass
    }

    diffEasyBtn.addEventListener('click', () => {
        selectedDifficulty = 0
        updateDifficultyUI()
    })

    diffNormalBtn.addEventListener('click', () => {
        selectedDifficulty = 1
        updateDifficultyUI()
    })

    powerOnBtn.addEventListener('click', () => {
        selectedPowerUps = true
        updatePowerUpsUI()
    })

    powerOffBtn.addEventListener('click', () => {
        selectedPowerUps = false
        updatePowerUpsUI()
    })

    maxScore3Btn.addEventListener('click', () => {
        selectedMaxScore = 3
        updateMaxScoreUI()
    })

    maxScore5Btn.addEventListener('click', () => {
        selectedMaxScore = 5
        updateMaxScoreUI()
    })

    maxScore7Btn.addEventListener('click', () => {
        selectedMaxScore = 7
        updateMaxScoreUI()
    })

    maxScore11Btn.addEventListener('click', () => {
        selectedMaxScore = 11
        updateMaxScoreUI()
    })

    maxScore21Btn.addEventListener('click', () => {
        selectedMaxScore = 21
        updateMaxScoreUI()
    })

    getEl("launchAIGameButton").addEventListener('click', async () => {
        try {
            await wsClient.connect(`ws://${window.location.host}/ws`)
            wsClient.joinAIGame(playerName, selectedDifficulty, selectedPowerUps, selectedMaxScore)
        } catch (error) {
            alert("Impossible de se connecter au serveur")
        }
    })

    getEl("cancelAIGameButton").addEventListener('click', () => {
        hide(aiGameModal)
        show(gameModeModal)
    })
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