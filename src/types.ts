export type Player = {
	id: string;
	alias: string;
	created_at: number;
}

export type Message = 
| { type: "join_tournament"; alias: string }
| { type: "player_input"; direction: "up" | "down" }