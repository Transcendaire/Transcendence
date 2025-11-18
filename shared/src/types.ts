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
| { type: "ping" }
| { type: "pong" }

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
