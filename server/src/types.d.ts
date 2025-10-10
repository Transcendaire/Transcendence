export type Player = {
    id: string;
    alias: string;
    created_at: number;
};
export type Message = {
    type: "join_tournament";
    alias: string;
} | {
    type: "player_input";
    direction: "up" | "down";
};
export type GameInput = {
    playerId: string;
    keys: {
        up: boolean;
        down: boolean;
    };
};
export type GameState = {
    player1: {
        paddle: {
            y: number;
        };
        score: number;
    };
    player2: {
        paddle: {
            y: number;
        };
        score: number;
    };
    ball: {
        x: number;
        y: number;
        vx: number;
        vy: number;
    };
};
export type WebSocketMessage = {
    type: "join";
    playerName: string;
} | {
    type: "waiting";
    message?: string;
} | {
    type: "playerJoined";
    playerCount: number;
} | {
    type: "gameStart";
    playerRole: 'player1' | 'player2';
} | {
    type: "input";
    data: GameInput;
} | {
    type: "gameState";
    data: GameState;
} | {
    type: "ping";
} | {
    type: "pong";
};
//# sourceMappingURL=types.d.ts.map