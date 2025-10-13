/**
 * État du jeu envoyé par le serveur au client toutes les 16ms
 */
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
};

/**
 * Input envoyé par le client au serveur
 */
export type GameInput = {
    playerId: string;
    keys: {
        up: boolean;
        down: boolean;
    };
};

/**
 * Messages WebSocket entre client et serveur
 */
export type WebSocketMessage = 
| { type: "join"; playerName: string }
| { type: "joinAI"; playerName: string }
| { type: "waiting"; message?: string }
| { type: "playerJoined"; playerCount: number }
| { type: "gameStart"; playerRole: 'player1' | 'player2' }
| { type: "input"; data: GameInput }
| { type: "gameState"; data: GameState }
| { type: "gameEnd"; winner: string }
| { type: "ping" }
| { type: "pong" };

/**
 * Résultat d'une partie
 */
export type GameResult = {
    winner: 'player1' | 'player2';
    player1Score: number;
    player2Score: number;
    duration: number;
};