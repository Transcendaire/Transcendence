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

export type WebSocketMessage = 
| { type: "join"; playerName: string }
| { type: "joinAI"; playerName: string }
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
