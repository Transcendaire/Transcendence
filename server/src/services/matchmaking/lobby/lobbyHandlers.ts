import { WebSocket } from 'ws'
import { Player } from '../core/types.js'
import { LobbyManager } from './lobbyManager.js'
import { sendMessage } from '../../../utils/websocket.js'

/**
 * @brief Handles all lobby-related WebSocket message operations
 * @details Delegates to LobbyManager for actual lobby management,
 *          validates session before critical actions
 */
export class LobbyHandlers
{
	private lobbyManager: LobbyManager
	private playerSockets: Map<WebSocket, Player>
	private isPlayerNameInActiveGame: (playerName: string) => boolean
	private validateSession: (socket: WebSocket) => boolean

	constructor(
		lobbyManager: LobbyManager,
		playerSockets: Map<WebSocket, Player>,
		isPlayerNameInActiveGame: (playerName: string) => boolean,
		validateSession: (socket: WebSocket) => boolean
	)
	{
		this.lobbyManager = lobbyManager
		this.playerSockets = playerSockets
		this.isPlayerNameInActiveGame = isPlayerNameInActiveGame
		this.validateSession = validateSession
	}

	/**
	 * @brief Set LobbyManager reference after construction
	 * @param lobbyManager LobbyManager instance
	 */
	public setLobbyManager(lobbyManager: LobbyManager): void
	{
		this.lobbyManager = lobbyManager
	}

	/**
	 * @brief Handle custom lobby creation
	 * @param socket Creator's WebSocket
	 * @param playerName Player's name
	 * @param name Lobby name
	 * @param lobbyType Type of lobby (tournament or battleroyale)
	 * @param maxPlayers Maximum players allowed
	 * @param settings Game settings
	 */
	public handleCreateLobby(
		socket: WebSocket, playerName: string, name: string,
		lobbyType: 'tournament' | 'battleroyale', maxPlayers: number, settings: any
	): void
	{
		const player = this.playerSockets.get(socket)
		if (player)
			player.name = playerName

		const lobbyId = this.lobbyManager.createLobby(socket, playerName,
			name, lobbyType, maxPlayers, settings)
		if (!lobbyId)
			return sendMessage(socket, { type: 'lobbyError', message: 'Already in a lobby' })

		const lobby = this.lobbyManager.getLobby(lobbyId)
		if (lobby)
			sendMessage(socket, { type: 'lobbyCreated', lobbyId, lobby })
	}

	/**
	 * @brief Handle joining a lobby
	 * @param socket Player's WebSocket
	 * @param playerName Player's name
	 * @param lobbyId Target lobby ID
	 */
	public handleJoinLobby(
		socket: WebSocket, playerName: string, lobbyId: string
	): void
	{
		const player = this.playerSockets.get(socket)
		if (player)
			player.name = playerName

		const error = this.lobbyManager.joinLobby(socket, playerName, lobbyId)
		if (error)
			sendMessage(socket, { type: 'lobbyError', message: error })
	}

	/**
	 * @brief Handle leaving a lobby
	 * @param socket Player's WebSocket
	 * @param lobbyId Lobby ID to leave
	 */
	public handleLeaveLobby(socket: WebSocket, lobbyId: string): void
	{
		const success = this.lobbyManager.leaveLobby(socket)
		if (!success)
			sendMessage(socket, { type: 'lobbyError', message: 'Not in a lobby' })
	}

	/**
	 * @brief Handle deleting a lobby
	 * @param socket Owner's WebSocket
	 * @param lobbyId Lobby ID to delete
	 */
	public handleDeleteLobby(socket: WebSocket, lobbyId: string): void
	{
		const error = this.lobbyManager.deleteLobby(socket, lobbyId)
		if (error)
			sendMessage(socket, { type: 'lobbyError', message: error })
	}

	/**
	 * @brief Handle adding bot to lobby
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 */
	public handleAddBot(socket: WebSocket, lobbyId: string): void
	{
		const error = this.lobbyManager.addBot(socket, lobbyId)
		if (error)
			sendMessage(socket, { type: 'lobbyError', message: error })
	}

	/**
	 * @brief Handle removing bot from lobby
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 * @param botId Bot ID to remove
	 */
	public handleRemoveBot(socket: WebSocket, lobbyId: string, botId: string): void
	{
		const error = this.lobbyManager.removeBot(socket, lobbyId, botId)
		if (error)
			sendMessage(socket, { type: 'lobbyError', message: error })
	}

	/**
	 * @brief Handle starting a lobby game
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 */
	public handleStartLobby(socket: WebSocket, lobbyId: string): void
	{
		if (!this.validateSession(socket))
			return
		const playerNames = this.lobbyManager.getPlayerNamesInLobby(lobbyId)

		for (const name of playerNames)
		{
			if (this.isPlayerNameInActiveGame(name))
			{
				sendMessage(socket, { type: 'lobbyError', message: `${name} est déjà en jeu` })
				return
			}
		}
		const error = this.lobbyManager.startLobby(socket, lobbyId)

		if (error)
			sendMessage(socket, { type: 'lobbyError', message: error })
	}

	/**
	 * @brief Handle request for lobby list
	 * @param socket Requester's WebSocket
	 */
	public handleRequestLobbyList(socket: WebSocket): void
	{
		const lobbies = this.lobbyManager.getOpenLobbies()
		sendMessage(socket, { type: 'lobbyList', lobbies })
	}
}
