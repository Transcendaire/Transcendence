// /**
//  * @brief Setup lobby event listeners
//  * @param joinButton Join game button
//  * @param playerNameInput Player name input field
//  * @param cancelButton Cancel waiting button
//  * @param lobbyScreen Lobby screen element
//  * @param gameScreen Game screen element
//  */
// function setupLobbyEventListeners(joinButton: HTMLButtonElement, playerNameInput: HTMLInputElement, 
//                                  cancelButton: HTMLButtonElement, lobbyScreen: HTMLElement, gameScreen: HTMLElement,
//                                  tournamentButtons: TournamentHTMLElements): void
// {
//     const getPlayerName = () => playerNameInput.value.trim() ; 

//     joinButton.addEventListener('click', async () => {

//         if (inputParser.parsePlayerName(getPlayerName()) === false)
//             return;
//         try {
//             await wsClient.connect(`ws://${window.location.host}/game`);
//             wsClient.joinGame(getPlayerName());
//         } catch (error) {
//             showError("Impossible de se connecter au serveur");
//         }
//     });

//     const joinAIButton = document.getElementById("joinAI") as HTMLButtonElement;
//     if (joinAIButton) {
//         joinAIButton.addEventListener('click', async () => {
//             const playerName = playerNameInput.value.trim();
//             if (!playerName) {
//                 showError("Veuillez entrer votre nom");
//                 return;
//             }
//             try {
//                 await wsClient.connect(`ws://${window.location.host}/game`);
//                 wsClient.joinAIGame(playerName);
//             } catch (error) {
//                 showError("Impossible de se connecter au serveur");
//             }
//         });
//     }
//     cancelButton.addEventListener('click', () => {
//         wsClient.disconnect();
//         returnToLobby();
//     });

//     tournamentButtons.joinTournamentButton.addEventListener('click', async () => {
//         if (inputParser.parsePlayerName(getPlayerName()) === false)
//             return;
//         showTournamentScreen(lobbyScreen, tournamentButtons.tournamentSetupScreen);	
//     });

//     tournamentButtons.createTournamentButton.addEventListener('click', async () => {
//         const tournamentName = tournamentButtons.tournamentNameInput.value.trim();
//         const nbPlayers = Number(tournamentButtons.playerCountInput.value.trim());
//         if (inputParser.parseTournament(tournamentName, nbPlayers) === false)
//             return;
//     })

//     tournamentButtons.cancelTournamentButton.addEventListener('click', async () => { 
//         returnToLobby();
//     })
// }

// function getTournamentElementsAsHTML(): TournamentHTMLElements {
//     return {
//             tournamentSetupScreen: document.getElementById("tournamentSetup") as HTMLButtonElement,
//             joinTournamentButton: document.getElementById("joinTournament") as HTMLButtonElement,
//             createTournamentButton: document.getElementById("createTournament") as HTMLButtonElement,
//             cancelTournamentButton: document.getElementById("cancelTournament") as HTMLButtonElement,
//             tournamentNameInput: document.getElementById("tournamentName") as HTMLInputElement,
//             playerCountInput: document.getElementById("playerCount") as HTMLInputElement
//     };
// }


//     const lobbyScreen = document.getElementById("lobby")!;
//     const gameScreen = document.getElementById("gameScreen")!;
//     const joinButton = document.getElementById("joinGame") as HTMLButtonElement;
//     const playerNameInput = document.getElementById("playerName") as HTMLInputElement;
//     const cancelButton = document.getElementById("cancelWait") as HTMLButtonElement;

//     const tournamentButtons: TournamentHTMLElements = getTournamentElementsAsHTML();    const lobbyScreen = document.getElementById("lobby")!;
//         const gameScreen = document.getElementById("gameScreen")!;
//         const joinButton = document.getElementById("joinGame") as HTMLButtonElement;
//         const playerNameInput = document.getElementById("playerName") as HTMLInputElement;
//         const cancelButton = document.getElementById("cancelWait") as HTMLButtonElement;
    
//         const tournamentButtons: TournamentHTMLElements = getTournamentElementsAsHTML();
