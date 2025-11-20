export type GameInput = {
	playerId: string;
	keys: {
		up: boolean;
		down: boolean;
		slot1?: boolean;
		slot2?: boolean;
		slot3?: boolean;
	};
}

export type PowerUpType = 'Son' | 'Pi' | '16' | null;

export type PowerUpFruit = {
	id: string;
	x: number;
	y: number;
	rotation: number;
}

export type CustomGameSettings = {
	maxScore: number;
	powerUpsEnabled: boolean;
	fruitFrequency: 'low' | 'normal' | 'high';
}

export type LobbyPlayer = {
	id: string;
	name: string;
	isBot: boolean;
	isReady: boolean;
}

export type Lobby = {
	id: string;
	creatorId: string;
	name: string;
	type: 'tournament' | 'multiplayergame';
	settings: CustomGameSettings;
	players: LobbyPlayer[];
	maxPlayers: number;
	status: 'waiting' | 'starting' | 'playing';
	createdAt: number;
}

export type GameState = {
	player1: {
		paddle: { y: number };
		score: number;
		itemSlots?: PowerUpType[];
		pendingPowerUps?: PowerUpType[];
		selectedSlots?: boolean[];
		hitStreak?: number;
		chargingPowerUp?: PowerUpType;
	};
	player2: {
		paddle: { y: number };
		score: number;
		itemSlots?: PowerUpType[];
		pendingPowerUps?: PowerUpType[];
		selectedSlots?: boolean[];
		hitStreak?: number;
		chargingPowerUp?: PowerUpType;
	};
	ball: {
		x: number;
		y: number;
		vx: number;
		vy: number;
	};
	cloneBalls?: Array<{
		x: number;
		y: number;
		vx: number;
		vy: number;
	}>;
	fruits?: PowerUpFruit[];
}

export type WebSocketMessage = 
| { type: "join"; playerName: string }
| { type: "joinCustom"; playerName: string }
| { type: "joinAI"; playerName: string }
| { type: "joinCustomAI"; playerName: string }
| { type: "waiting"; message?: string }
| { type: "playerJoined"; playerCount: number }
| { type: "gameStart"; playerRole: 'player1' | 'player2' }
| { type: "input"; data: GameInput }
| { type: "gameState"; data: GameState }
| { type: "gameOver"; winner: 'player1' | 'player2'; score1: number; score2: number }
| { type: "surrender" }
| { type: "ping" }
| { type: "pong" }
| { type: "createCustomLobby"; playerName: string; name: string; lobbyType: 'tournament' | 'multiplayergame'; settings: CustomGameSettings }
| { type: "joinLobby"; playerName: string; lobbyId: string }
| { type: "leaveLobby"; lobbyId: string }
| { type: "deleteLobby"; lobbyId: string }
| { type: "addBot"; lobbyId: string }
| { type: "removeBot"; lobbyId: string; botId: string }
| { type: "startLobby"; lobbyId: string }
| { type: "requestLobbyList" }
| { type: "lobbyCreated"; lobbyId: string; lobby: Lobby }
| { type: "lobbyUpdate"; lobby: Lobby }
| { type: "lobbyList"; lobbies: Lobby[] }
| { type: "lobbyError"; message: string }

/**
 * Provide minimal DOM element type aliases in case the TypeScript project
 * does not include the DOM lib (lib.dom.d.ts).
 */
declare type HTMLButtonElement = any;
declare type HTMLInputElement = any;

export interface TournamentHTMLElements {
	tournamentSetupScreen: HTMLButtonElement;
	joinTournamentButton: HTMLButtonElement;
	createTournamentButton: HTMLButtonElement;
	cancelTournamentButton: HTMLButtonElement;
	tournamentNameInput: HTMLInputElement;
	playerCountInput: HTMLInputElement;
}
