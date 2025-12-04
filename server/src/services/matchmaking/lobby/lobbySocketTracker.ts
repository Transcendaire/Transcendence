import { WebSocket } from 'ws'
import { Lobby } from '@app/shared/types.js'
import { sendMessage } from '../../../utils/websocket.js'

/**
 * @brief Manages socket-to-lobby associations and broadcasts
 * @details Tracks which sockets are in which lobbies and handles
 *          lobby update broadcasts
 */
export class LobbySocketTracker
{
	private socketToLobby: Map<WebSocket, string> = new Map()
	private lobbyToSockets: Map<string, Set<WebSocket>> = new Map()
	private socketToPlayerId: Map<WebSocket, string> = new Map()
	private allSockets: Map<WebSocket, any>
	private lobbies: Map<string, Lobby>

	constructor(allSockets: Map<WebSocket, any>, lobbies: Map<string, Lobby>)
	{
		this.allSockets = allSockets
		this.lobbies = lobbies
	}

	/**
	 * @brief Track socket association with lobby
	 * @param socket WebSocket connection
	 * @param lobbyId Lobby identifier
	 * @param playerId Player identifier
	 */
	public trackSocket(socket: WebSocket, lobbyId: string, playerId: string): void
	{
		this.socketToLobby.set(socket, lobbyId)
		this.socketToPlayerId.set(socket, playerId)
		if (!this.lobbyToSockets.has(lobbyId))
			this.lobbyToSockets.set(lobbyId, new Set())
		this.lobbyToSockets.get(lobbyId)!.add(socket)
	}

	/**
	 * @brief Remove socket tracking
	 * @param socket WebSocket connection
	 */
	public untrackSocket(socket: WebSocket): void
	{
		const lobbyId = this.socketToLobby.get(socket)
		if (lobbyId)
		{
			const sockets = this.lobbyToSockets.get(lobbyId)
			if (sockets)
			{
				sockets.delete(socket)
				if (sockets.size === 0)
					this.lobbyToSockets.delete(lobbyId)
			}
		}
		this.socketToLobby.delete(socket)
		this.socketToPlayerId.delete(socket)
	}

	/**
	 * @brief Get lobby ID for a socket
	 * @param socket WebSocket connection
	 * @returns Lobby ID or undefined
	 */
	public getLobbyId(socket: WebSocket): string | undefined
	{
		return this.socketToLobby.get(socket)
	}

	/**
	 * @brief Get player ID for a socket
	 * @param socket WebSocket connection
	 * @returns Player ID or undefined
	 */
	public getPlayerId(socket: WebSocket): string | undefined
	{
		return this.socketToPlayerId.get(socket)
	}

	/**
	 * @brief Get all sockets in a lobby
	 * @param lobbyId Lobby identifier
	 * @returns Set of sockets or undefined
	 */
	public getLobbySockets(lobbyId: string): Set<WebSocket> | undefined
	{
		return this.lobbyToSockets.get(lobbyId)
	}

	/**
	 * @brief Check if socket is in a lobby
	 * @param socket WebSocket connection
	 * @returns True if socket is tracked
	 */
	public isInLobby(socket: WebSocket): boolean
	{
		return this.socketToLobby.has(socket)
	}

	/**
	 * @brief Delete lobby socket tracking
	 * @param lobbyId Lobby identifier
	 */
	public deleteLobby(lobbyId: string): void
	{
		this.lobbyToSockets.delete(lobbyId)
	}

	/**
	 * @brief Get socket to player ID map (for external use)
	 * @returns Map reference
	 */
	public getSocketToPlayerIdMap(): Map<WebSocket, string>
	{
		return this.socketToPlayerId
	}

	/**
	 * @brief Broadcast lobby update to all members
	 * @param lobby Lobby to broadcast
	 */
	public broadcastLobbyUpdate(lobby: Lobby): void
	{
		const sockets = this.lobbyToSockets.get(lobby.id)

		if (!sockets)
			return
		for (const socket of sockets)
			sendMessage(socket, { type: 'lobbyUpdate', lobby })
	}

	/**
	 * @brief Broadcast lobby list to all connected clients
	 */
	public broadcastLobbyListToAll(): void
	{
		const lobbies = Array.from(this.lobbies.values())
			.filter(l => l.status === 'waiting')

		console.log(`[LOBBY] Broadcasting list to ${this.allSockets.size} clients`)
		for (const socket of this.allSockets.keys())
			sendMessage(socket, { type: 'lobbyList', lobbies })
	}

	/**
	 * @brief Notify lobby members and untrack sockets on deletion
	 * @param lobbyId Lobby identifier
	 * @param message Message to send
	 */
	public notifyAndUntrackAll(lobbyId: string, message: object): void
	{
		const sockets = this.lobbyToSockets.get(lobbyId)
		if (!sockets)
			return
		const msgStr = JSON.stringify(message)

		for (const sock of sockets)
		{
			if (sock.readyState === WebSocket.OPEN)
				sock.send(msgStr)
			this.untrackSocket(sock)
		}
	}
}
