import { GameState, GameInput, WebSocketMessage, Lobby } from "/dist/shared/types.js";

/**
 * @brief WebSocket client for real-time game communication
 */
export class WebSocketClient
{
    private ws?: WebSocket;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private lastPingTime = 0;
    private latency = 0;
    private pendingGameStart: 'player1' | 'player2' | null = null;
    private _isCustomGame = false;
    private intentionalDisconnect = false;
    
    public onGameState?: (gameState: GameState) => void;
    public onWaitingForPlayer?: () => void;
    private _onGameStart: ((playerRole: 'player1' | 'player2') => void) | null = null;
    public onPlayerJoined?: (playerCount: number) => void;
    public onDisconnected?: () => void;
    public onError?: (error: string) => void;
    public onGameOver?: (winner: 'player1' | 'player2', score1: number, score2: number, isTournament?: boolean, shouldDisconnect?: boolean, forfeit?: boolean) => void;
    
    public onLobbyCreated?: (lobbyId: string, lobby: Lobby) => void;
    public onLobbyUpdate?: (lobby: Lobby) => void;
    public onLobbyList?: (lobbies: Lobby[]) => void;
    public onLobbyError?: (message: string) => void;
    
    public get onGameStart() {
        return this._onGameStart;
    }
    
    public set onGameStart(callback: ((playerRole: 'player1' | 'player2') => void) | null) {
        this._onGameStart = callback;
        if (callback && this.pendingGameStart) {
            console.log('[WEBSOCKET] Appel du callback gameStart en attente avec role:', this.pendingGameStart);
            callback(this.pendingGameStart);
            this.pendingGameStart = null;
        }
    }

    /**
     * @brief Connect to WebSocket server
     * @param serverUrl WebSocket server URL
     * @returns Promise that resolves when connected
     */
    public connect(serverUrl: string): Promise<void>
    {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(serverUrl);
                
                this.ws.onopen = () => {
                    console.log('WebSocket connecté');
                    this.reconnectAttempts = 0;
                    resolve();
                };
                this.ws.onmessage = (event) => {
                    try {
                        const message: WebSocketMessage = JSON.parse(event.data);
                        
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Erreur parsing message WebSocket:', error);
                    }
                };
                this.ws.onclose = () => {
                    console.log('WebSocket fermé');
                    this.onDisconnected?.();
                    if (!this.intentionalDisconnect) {
                        this.attemptReconnect();
                    } else {
                        console.log('Déconnexion volontaire, pas de reconnexion');
                        this.intentionalDisconnect = false; // Reset le flag
                    }
                };
                this.ws.onerror = (error) => {
                    console.error('Erreur WebSocket:', error);
                    this.onError?.('Erreur de connexion WebSocket');
                    reject(error);
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    private handleMessage(message: WebSocketMessage): void
    {
        switch (message.type) {
            case 'gameState':
                if (message.data) {
                    this.onGameState?.(message.data);
                }
                break;
                
            case 'waiting':
                const waitingMessage = message.message || 'En attente d\'un autre joueur...';
                console.log(`[WEBSOCKET] ${waitingMessage}`);
                if (message.message && message.message.includes('déconnecté')) {
                    alert(message.message);
                    this.disconnect();
                    this.onDisconnected?.();
                } else {
                    this.onWaitingForPlayer?.();
                }
                break;
                
            case 'gameStart':
                if (message.playerRole) {
                    console.log(`[WEBSOCKET] Jeu demarre! Vous etes: ${message.playerRole}, Custom: ${message.isCustom}`);
                    if (message.isCustom !== undefined) {
                        this._isCustomGame = message.isCustom;
                        console.log(`[WEBSOCKET] Mode Custom défini: ${this._isCustomGame}`);
                    }
                    if (this._onGameStart) {
                        this._onGameStart(message.playerRole);
                    } else {
                        console.log('[WEBSOCKET] Callback onGameStart pas encore défini, mise en attente...');
                        this.pendingGameStart = message.playerRole;
                    }
                }
                break;
                
            case 'playerJoined':
                if (message.playerCount !== undefined) {
                    console.log(`[WEBSOCKET] Joueur rejoint! Nombre de joueurs: ${message.playerCount}/2`);
                    this.onPlayerJoined?.(message.playerCount);
                }
                break;
                
            case 'pong':
                this.calculateLatency();
                break;
                
            case 'gameOver':
                if (message.winner && message.score1 !== undefined && message.score2 !== undefined) {
                    console.log(`[WEBSOCKET] Game Over! Winner: ${message.winner}, Tournament: ${message.isTournament}, Should disconnect: ${message.shouldDisconnect}, Forfeit: ${message.forfeit}`);
                    this.onGameOver?.(message.winner, message.score1, message.score2, message.isTournament, message.shouldDisconnect, message.forfeit);
                }
                break;
                
            case 'lobbyCreated':
                if (message.lobbyId && message.lobby) {
                    console.log(`[WEBSOCKET] Lobby créé: ${message.lobbyId}`);
                    this.onLobbyCreated?.(message.lobbyId, message.lobby);
                }
                break;
                
            case 'lobbyUpdate':
                if (message.lobby) {
                    console.log(`[WEBSOCKET] Mise à jour du lobby: ${message.lobby.id}`);
                    this.onLobbyUpdate?.(message.lobby);
                }
                break;
                
            case 'lobbyList':
                if (message.lobbies) {
                    console.log(`[WEBSOCKET] Liste des lobbies reçue: ${message.lobbies.length}`);
                    this.onLobbyList?.(message.lobbies);
                }
                break;
                
            case 'lobbyError':
                if (message.message) {
                    console.error(`[WEBSOCKET] Erreur lobby: ${message.message}`);
                    this.onLobbyError?.(message.message);
                }
                break;
                
            case 'waitingForMatch':
                if (message.message) {
                    console.log(`[WEBSOCKET] ${message.message}`);
                    this.onWaitingForPlayer?.();
                }
                break;
                
            case 'tournamentComplete':
                if (message.champion && message.tournamentName) {
                    console.log(`[WEBSOCKET] Tournament ${message.tournamentName} terminé! Champion: ${message.champion}`);
                    alert(`🏆 Tournoi "${message.tournamentName}" terminé!\nChampion: ${message.champion}`);
                }
                break;
                
            default:
                console.warn('[WEBSOCKET] Type de message inconnu:', message.type);
        }
    }

    /**
     * @brief Join game with player name
     * @param playerName Player's display name
     */
    public joinGame(playerName: string): void
    {
        this._isCustomGame = false;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
                type: 'join',
                playerName
            };
            
            this.ws.send(JSON.stringify(message));
        }
    }
    /**
     * @brief Join game against AI
     * @param playerName Player's display name
     * @param difficulty AI difficulty (0=easy, 1=normal, 2=hard)
     * @param enablePowerUps Enable power-ups mode
     * @param maxScore Score needed to win
     */
    public joinAIGame(
        playerName: string,
        difficulty: number = 1,
        enablePowerUps: boolean = false,
        maxScore: number = 5
    ): void
    {
        this._isCustomGame = enablePowerUps
        if (this.ws && this.ws.readyState === WebSocket.OPEN)
        {
            const message: WebSocketMessage = {
                type: 'joinAI',
                playerName,
                difficulty,
                enablePowerUps,
                maxScore
            }
            this.ws.send(JSON.stringify(message))
        }
    }

    /**
     * @brief Join custom game with power-ups
     * @param playerName Player's display name
     */
    public joinCustomGame(playerName: string): void
    {
        this._isCustomGame = true;
        if (this.ws && this.ws.readyState === WebSocket.OPEN)
        {
            const message: WebSocketMessage = {
                type: 'joinCustom',
                playerName
            }
            this.ws.send(JSON.stringify(message))
        }
    }

    /**
     * @brief Send player input to server
     * @param input Player's input state
     */
    public sendInput(input: GameInput): void
    {
        if (this.ws && this.ws.readyState === WebSocket.OPEN)
        {
            const message: WebSocketMessage = {
                type: 'input',
                data: input
            }
            this.ws.send(JSON.stringify(message))
        }
    }

    public sendPing(): void
    {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.lastPingTime = Date.now();
            const message: WebSocketMessage = {
                type: 'ping'
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * @brief Notify server that player surrenders/abandons
     */
    public surrender(): void
    {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = { type: 'surrender' }
            this.ws.send(JSON.stringify(message))
        }
    }

    private calculateLatency(): void
    {
        this.latency = Date.now() - this.lastPingTime;
    }

    public getPing(): number
    {
        return this.latency;
    }

    private attemptReconnect(): void
    {
        if (this.reconnectAttempts >= this.maxReconnectAttempts)
		{
            this.onError?.('Impossible de se reconnecter au serveur');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
            this.connect(`ws://${window.location.host}/ws`).catch(console.error);
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    public disconnect(): void
    {
        if (this.ws) {
            this.intentionalDisconnect = true; // Marque la déconnexion comme volontaire
            this.ws.close();
            delete this.ws;
        }
    }

    public isConnected(): boolean
    {
        return this.ws !== undefined && this.ws.readyState === WebSocket.OPEN;
    }

    public isCustomGame(): boolean
    {
        return this._isCustomGame;
    }

    /**
     * @brief Send a generic WebSocket message
     * @param message WebSocketMessage to send
     */
    public sendMessage(message: WebSocketMessage): void
    {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('[WEBSOCKET] Impossible d\'envoyer le message, WebSocket non connecté');
        }
    }
}

export const wsClient = new WebSocketClient();
