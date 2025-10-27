import { GameState } from "@shared/types.js";

export { GameInput, GameState, WebSocketMessage, TournamentHTMLElements } from "@shared/types.js";

export type Player = {
	id: string;
	alias: string;
	createdAt: number;
}

export type Message = 
| { type: "join_tournament"; alias: string }
| { type: "player_input"; direction: "up" | "down" }

export type Tournament = {
	id: string;
	name: string;
	maxPlayers: number;
	currentPlayers: number;
	players: Player[];
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
