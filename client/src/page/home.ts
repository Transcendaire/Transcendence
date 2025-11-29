import { registerPageInitializer, navigate } from "../router";
import { inputParserClass } from "../components/inputParser";
import { wsClient } from "../components/WebSocketClient";
import { getEl, show, hide, setupGlobalModalEvents } from "../app";
import { initGoogle,loadGoogleScript } from "../components/googleAuth";

export let isLoggedIn: boolean = false;
export let playerName: string = "";
const inputParser = new inputParserClass();

const handleGoogleSignIn = () => {
    google.accounts.id.prompt();

}

async function initHomePage() {
    const gameModeModal = getEl("gameModeModal")
    const fastGameModal = getEl("fastGameModal")
    const aiGameModal = getEl("aiGameModal")
    const loginModal = getEl("loginModal")
    const signinModal = getEl("signinModal")
    const waitingModal = getEl("waitingModal")
    const playButton = getEl("playButton") as HTMLButtonElement
    const redirect = getEl("signinRedirect") as HTMLButtonElement

    console.log(`playerName : ${playerName} is loggedIn ${isLoggedIn}`);

    const alias = await getUserWithCookies();
    console.log(`alias is ${alias}`);
    if (alias) {
        playerName = alias;
        isLoggedIn = true;
    }

    await loadGoogleScript();
    await initGoogle();

    getEl("googleLoginButton").addEventListener('click', handleGoogleSignIn);

    updateUI();

    setupWebsocket(waitingModal);

    getEl("cancelGameModeButton").addEventListener('click', () => hide(gameModeModal));
    getEl("profileButton").addEventListener('click', () => navigate("profile"));
    getEl("logoutButton").addEventListener('click', logout)

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

function initLoginModal(loginModal: HTMLElement) {
    const loginButton = getEl("loginButton") as HTMLButtonElement;
    const checkButton = getEl("checkInput") as HTMLButtonElement;
    const cancelLoginButton = getEl("cancelLoginButton") as HTMLButtonElement;
    const playerInput = getEl("usernameCheck") as HTMLInputElement;
    const passwordInput = getEl("passwordCheck") as HTMLInputElement;

    setupGlobalModalEvents(loginModal, loginButton, cancelLoginButton);
    // loginButton.addEventListener('click', () => console.log('bouton login cliquer'));


    const connect = async () => {
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
            if (!response.ok) {
                alert(data.error || 'Erreur lors de la connexion');
                return;
            }
            playerName = data.alias;
            isLoggedIn = true;
            hide(loginModal)
            updateUI();

        } catch (error) {
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

async function initsigninModal(signinModal: HTMLElement) {
    const signinButton = getEl("signinButton") as HTMLButtonElement;
    const cancelSigninButton = getEl("cancelSigninButton") as HTMLButtonElement
    const usernameInput = getEl("newUser") as HTMLInputElement;
    const aliasInput = getEl("newAlias") as HTMLInputElement;
    const passwordInput = getEl("createPassword") as HTMLInputElement;
    const confirmPasswordInput = getEl("passwordConfirmation") as HTMLInputElement;
    const checkSignInInput = getEl("checkSignInInput") as HTMLButtonElement;

    setupGlobalModalEvents(signinModal, signinButton, cancelSigninButton);
    // signinButton.addEventListener('click', () => console.log('bouton sign in cliquer'));


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
            if (!response.ok) {
                alert(data.error || 'Erreur lors de l\'inscription');
                return;
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

function initGameModeModal(
    gameModeModal: HTMLElement,
    fastGameModal: HTMLElement,
    aiGameModal: HTMLElement
): void {
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

function initFastGameModal(fastGameModal: HTMLElement, gameModeModal: HTMLElement): void {
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

function initAIGameModal(aiGameModal: HTMLElement, gameModeModal: HTMLElement): void {
    aiGameModal.addEventListener('click', (event) => {
        if (event.target === aiGameModal)
            hide(aiGameModal)
    })

    const difficulty = createToggleGroup(['difficultyEasyButton', 'difficultyNormalButton'], 0);
    const powerUps = createToggleGroup(['powerUpsOnButton', 'powerUpsOffButton'], 0);
    const maxScore = createToggleGroup(['maxScore3Button', 'maxScore5Button', 'maxScore7Button', 'maxScore11Button', 'maxScore21Button'], 1);

    getEl("launchAIGameButton").addEventListener('click', async () => {
        try {
            const selectedDifficulty = parseInt(difficulty());
            const selectedPowerUps = powerUps() === 'true';
            const selectedMaxScore = parseInt(maxScore());
            console.log(`game ${selectedDifficulty === 0 ? 'easy' : 'normal'} ${selectedPowerUps === true ? 'avec' : 'sans'} pouvoir de ${selectedMaxScore} points max `);
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

function initWaitingModal(modal: HTMLElement) {
    const cancelWaitButton = getEl("cancelWaitButton");

    cancelWaitButton.addEventListener('click', () => {
        wsClient.disconnect();
        hide(modal);
    });
}


async function logout(): Promise<void> {
    try {
        const res = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin'
        });
    } catch (error) {
        console.log('erreur logout(): ', error);
    }
    isLoggedIn = false;
    playerName = "";
    updateUI();
}


function createToggleGroup(buttonIds: string[], initialIndex: number = 0): () => string {
    const activeClass = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-sonpi16-orange text-sonpi16-black border-4 border-white transition-all duration-300";
    const inactiveClass = "flex-1 py-3 rounded-xl font-quency font-bold text-lg bg-gray-600 text-gray-300 border-4 border-transparent transition-all duration-300 hover:bg-gray-500";

    const buttons = buttonIds.map(id => getEl(id) as HTMLButtonElement);
    let selectedIndex = initialIndex;

    const update = () => {
        buttons.forEach((btn, i) => {
            btn.className = i === selectedIndex ? activeClass : inactiveClass;
        });
    };

    buttons.forEach((btn, i) => {
        btn.addEventListener('click', () => {
            selectedIndex = i;
            update();
        });
    });

    update();

    console.log(buttons[selectedIndex]?.dataset?.value ?? String(selectedIndex));

    return () => buttons[selectedIndex]?.dataset?.value ?? String(selectedIndex);
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

function setupWebsocket(waitingModal: HTMLElement) {
    wsClient.onWaitingForPlayer = () => {
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

async function getUserWithCookies(): Promise<string | undefined> {
    try {

        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (res.ok)
            return data.alias;
        else
            return undefined;
    } catch (error) {
        console.log('getUserWithCookies(): erreur : ', error);
    }
    return undefined;
}
registerPageInitializer('home', initHomePage);