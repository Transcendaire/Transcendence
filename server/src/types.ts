export type Player = {
	id: string;
	alias: string;
	created_at: number;
}

export type Message =
  | { type: "join"; playerId: string }
  | { type: "input"; playerId: string; input: "up" | "down" | "stop" };

export type OutgoingMessage =
  | { type: "joined"; playerId: string }
  | { type: "state_update"; state: any }
  | { type: "error"; reason: string };