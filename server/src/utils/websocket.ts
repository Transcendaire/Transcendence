import { WebSocket } from 'ws'
import { WebSocketMessage } from '../types.js'

/**
 * @brief Send message to WebSocket client
 * @param socket Target WebSocket connection
 * @param message Message to send
 */
export function sendMessage(socket: WebSocket, message: WebSocketMessage): void
{
	if (socket && socket.readyState === socket.OPEN)
		socket.send(JSON.stringify(message))
}
