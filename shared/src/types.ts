export type Point2D = {
	x: number;
	y: number;
}

export type SideData = {
	start: Point2D;
	end: Point2D;
	center: Point2D;
	angle: number;
	length: number;
}

export type PolygonData = {
	vertices: Point2D[];
	sides: SideData[];
	center: Point2D;
	radius: number;
	cornerRadius: number;
}

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
	lifeCount: number;
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
	type: 'tournament' | 'battleroyale';
	settings: CustomGameSettings;
	players: LobbyPlayer[];
	maxPlayers: number;
	status: 'waiting' | 'starting' | 'playing';
	createdAt: number;
}

export type PlayerState = {
	paddle: {
		y: number;
		x?: number;
		angle?: number;
		sidePosition?: number;
		length?: number;
		width?: number;
	};
	lives: number;
	isEliminated?: boolean;
	name?: string;
	ping?: number;
	itemSlots?: PowerUpType[];
	pendingPowerUps?: PowerUpType[];
	selectedSlots?: boolean[];
	hitStreak?: number;
	chargingPowerUp?: PowerUpType;
}

export type GameState = {
	players: PlayerState[];
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
	polygonData?: PolygonData;
	isBattleRoyale?: boolean;
}

export type WebSocketMessage = 
| { type: "join"; playerName: string }
| { type: "joinCustom"; playerName: string }
| { type: "joinAI"; playerName: string; difficulty?: number; enablePowerUps?: boolean; lifeCount?: number }
| { type: "waiting"; message?: string }
| { type: "playerJoined"; playerCount: number }
| { type: "gameStart"; playerRole: 'player1' | 'player2'; isCustom?: boolean; player1Name: string; player2Name: string }
| { type: "input"; data: GameInput }
| { type: "gameState"; data: GameState }
| { type: "gameOver"; winner: 'player1' | 'player2'; lives1: number; lives2: number; isTournament?: boolean; shouldDisconnect?: boolean; forfeit?: boolean }
| { type: "surrender" }
| { type: "ping"; pingValue?: number }
| { type: "pong" }
| { type: "createCustomLobby"; playerName: string; name: string; lobbyType: 'tournament' | 'battleroyale'; maxPlayers: number; settings: CustomGameSettings }
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
| { type: "waitingForMatch"; message: string }
| { type: "tournamentComplete"; champion: string; tournamentName: string }

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
