export type Player = {
	id: string;
	alias: string;
	createdAt: number;
}

export type Message = 
| { type: "join_tournament"; alias: string }
| { type: "player_input"; direction: "up" | "down" }

export type GameInput = {
	playerId: string;
	keys: {
		up: boolean;
		down: boolean;
	};
}

export type GameState = {
	player1: {
		paddle: { y: number };
		score: number;
	};
	player2: {
		paddle: { y: number };
		score: number;
	};
	ball: {
		x: number;
		y: number;
		vx: number;
		vy: number;
	};
}

export type Tournament = {
	id: string;
	name: string;
	maxPlayers: number;
	currentPlayers: number;
	players: Player[]; //? shouldn't they be stored inside the database?
	round: number;
	status: 'created' | 'active' | 'completed';
	createdAt: number;
}

export type TournamentPlayer = {
	id: string;
	alias: string;
	status: 'playing' | 'waiting' | 'eliminated'
}

export type TournamentGame = {
	game: GameState;
	bracket: string;
}

export interface TournamentHTMLElements {
	tournamentSetupScreen: HTMLButtonElement;
	joinTournamentButton: HTMLButtonElement;
	createTournamentButton: HTMLButtonElement;
	cancelTournamentButton: HTMLButtonElement;
	tournamentNameInput: HTMLInputElement;
	playerCountInput: HTMLInputElement;
}

export type WebSocketMessage = 
| { type: "join"; playerName: string }
| { type: "waiting"; message?: string }
| { type: "playerJoined"; playerCount: number }
| { type: "gameStart"; playerRole: 'player1' | 'player2' }
| { type: "input"; data: GameInput }
| { type: "gameState"; data: GameState }
| { type: "ping" }
| { type: "pong" }
// | { type: "createTournament"; name: string, maxPlayers: number }
// | { type: "joinTournament"; tournamentId: string, player: string}
// | { type: "tournamentUpdate"; tournament: Tournament}
// | { type: "endTournament"; name:string }
 //? not necessary anymore?

//*RANDOM
/*
-> NV WEBSOCKET POUR LES TOURNOIS
-> /tournament as endpoint
-> one client creates a tournamnt and is the admin (starting, ending...)
-> server sends available tournament when joining /tournament. Client can join/create tournament
-> formulaire de creation d'un tournoi a la creation (nb joueurs, nom tournoi...). 
	temps d'attente ensuite et fill par ia si pas assez de joueurs sinon lancer game
-> servir les tournois/game room dispo dans /tournament. 
-> possibilite de spectatecg
-> using w3ebclass as base class for websockettournament and modify handleMessage
-> websocket is served because the client is sent to it according to its actions on a given button
*/