import { GameState, GameInput, WebSocketMessage } from "../../shared/types.js";

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
    
    public onGameState?: (gameState: GameState) => void;
    public onWaitingForPlayer?: () => void;
    public onGameStart?: (playerRole: 'player1' | 'player2') => void;
    public onPlayerJoined?: (playerCount: number) => void;
    public onDisconnected?: () => void;
    public onError?: (error: string) => void;

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
                    this.attemptReconnect();
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
                console.log('[WEBSOCKET] En attente d\'un autre joueur...');
                this.onWaitingForPlayer?.();
                break;
                
            case 'gameStart':
                if (message.playerRole) {
                    console.log(`[WEBSOCKET] Jeu demarre! Vous etes: ${message.playerRole}`);
                    this.onGameStart?.(message.playerRole);
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
     */
    public joinAIGame(playerName: string): void
    {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
                type: 'joinAI',
                playerName
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
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
                type: 'joinCustom',
                playerName
            }
            this.ws.send(JSON.stringify(message))
        }
    }

    /**
     * @brief Join custom game against AI with power-ups
     * @param playerName Player's display name
     */
    public joinCustomAIGame(playerName: string): void
    {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
                type: 'joinCustomAI',
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
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = {
                type: 'input',
                data: input
            };
            
            this.ws.send(JSON.stringify(message));
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
            this.connect(`ws://${window.location.host}/game`).catch(console.error);
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    public disconnect(): void
    {
        if (this.ws) {
            this.ws.close();
            delete this.ws;
        }
    }

    public isConnected(): boolean
    {
        return this.ws !== undefined && this.ws.readyState === WebSocket.OPEN;
    }
}
