import { WebSocket } from 'ws'
import { Lobby, LobbyPlayer, CustomGameSettings } from '@app/shared/types.js'
import { GameRoomManager } from '../game/gameRoomManager.js'
import { TournamentManagerService } from '../../tournament/tournamentManager.js'
import { LobbySocketTracker } from './lobbySocketTracker.js'
import { LobbyStartService } from './lobbyStartService.js'
import { getDatabase } from '../../../db/databaseSingleton.js'
import {
	generatePlayerId, generateLobbyId, generateBotId,
	createLobbyPlayer, getNextBotNumber
} from './lobbyHelpers.js'

/**
 * @brief Manages custom game lobbies for 2-16 players
 * @details Handles lobby creation, player management, bot addition,
 *          ownership transfer, and game start with strict security checks
 */
export class LobbyManager
{
	private lobbies: Map<string, Lobby> = new Map()
	private socketTracker: LobbySocketTracker
	private startService: LobbyStartService
	private gameRoomManager: GameRoomManager

	constructor(
		gameRoomManager: GameRoomManager,
		allSockets: Map<WebSocket, any>,
		tournamentManager: TournamentManagerService
	)
	{
		this.gameRoomManager = gameRoomManager
		this.socketTracker = new LobbySocketTracker(allSockets, this.lobbies)
		this.startService = new LobbyStartService(
			gameRoomManager, tournamentManager, this.socketTracker)
	}

	/**
	 * @brief Check if a player name is already in any lobby
	 * @param playerName Player's name to check
	 * @returns True if player is in a lobby
	 */
	public isPlayerNameInAnyLobby(playerName: string): boolean
	{
		for (const lobby of this.lobbies.values())
		{
			if (lobby.players.some(p => p.name === playerName && !p.isBot))
				return true
		}
		return false
	}

	/**
	 * @brief Get the socket of a player by their name
	 * @param playerName Player's name to find
	 * @returns WebSocket or undefined if not found
	 */
	public getSocketByPlayerName(playerName: string): WebSocket | undefined
	{
		const socketMap = this.socketTracker.getSocketToPlayerIdMap()

		for (const [socket, playerId] of socketMap.entries())
		{
			const lobbyId = this.socketTracker.getLobbyId(socket)

			if (!lobbyId)
				continue
			const lobby = this.lobbies.get(lobbyId)
			const player = lobby?.players.find(
				p => p.id === playerId && p.name === playerName && !p.isBot)

			if (player)
				return socket
		}
		return undefined
	}

	/**
	 * @brief Remove a player from any lobby by their name
	 * @param playerName Player's name to remove
	 * @returns True if player was removed
	 */
	public removePlayerByName(playerName: string): boolean
	{
		const socket = this.getSocketByPlayerName(playerName)

		if (socket)
			return this.leaveLobby(socket)
		return false
	}

	/**
	 * @brief Create new custom lobby
	 * @param socket Creator's WebSocket connection
	 * @param playerName Creator's name
	 * @param lobbyName Lobby display name
	 * @param lobbyType Type of lobby (tournament or battleroyale)
	 * @param maxPlayers Maximum players allowed
	 * @param settings Game settings
	 * @returns Created lobby ID or null if player already in lobby
	 */
	public createLobby(
		socket: WebSocket, playerName: string, lobbyName: string,
		lobbyType: 'tournament' | 'battleroyale',
		maxPlayers: number, settings: CustomGameSettings
	): string | null
	{
		if (this.socketTracker.isInLobby(socket))
			return null
		if (this.isPlayerNameInAnyLobby(playerName))
			return null
		const playerId = this.socketTracker.getPlayerId(socket) || generatePlayerId()
		const lobbyId = generateLobbyId()
		
		const db = getDatabase()
		const user = db.getUserByAlias(playerName)
		let avatar: string | undefined
		if (user)
		{
			const avatarFilename = db.getUserAvatar(user.id)
			const googlePicture = db.getUserGooglePicture(user.id)
			if (googlePicture)
				avatar = `/avatars/users/${googlePicture}`
			else if (avatarFilename)
				avatar = avatarFilename === 'Transcendaire.png' ? `/avatars/defaults/${avatarFilename}` : `/avatars/users/${avatarFilename}`
		}
		
		const creatorPlayer = createLobbyPlayer(playerId, playerName, false, true, avatar)
		const lobby: Lobby = {
			id: lobbyId, creatorId: playerId, name: lobbyName,
			type: lobbyType, settings, players: [creatorPlayer],
			maxPlayers, status: 'waiting', createdAt: Date.now()
		}

		this.lobbies.set(lobbyId, lobby)
		this.socketTracker.trackSocket(socket, lobbyId, playerId)
		console.log(`[LOBBY] Created ${lobbyType} "${lobbyName}" by ${playerName}`)
		this.socketTracker.broadcastLobbyListToAll()
		return lobbyId
	}

	/**
	 * @brief Join existing lobby
	 * @param socket Player's WebSocket
	 * @param playerName Player's name
	 * @param lobbyId Target lobby ID
	 * @returns Error message or null on success
	 */
	public joinLobby(
		socket: WebSocket, playerName: string, lobbyId: string
	): string | null
	{
		if (this.socketTracker.isInLobby(socket))
			return "You are already in a lobby"
		if (this.isPlayerNameInAnyLobby(playerName))
			return "You are already in a lobby"
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby)
			return "Lobby not found"
		if (lobby.status !== 'waiting')
			return "Lobby already started"
		if (lobby.players.length >= lobby.maxPlayers)
			return "Lobby is full"
		const playerId = this.socketTracker.getPlayerId(socket) || generatePlayerId()
		
		const db = getDatabase()
		const user = db.getUserByAlias(playerName)
		let avatar: string | undefined
		if (user)
		{
			const avatarFilename = db.getUserAvatar(user.id)
			const googlePicture = db.getUserGooglePicture(user.id)
			if (googlePicture)
				avatar = `/avatars/users/${googlePicture}`
			else if (avatarFilename)
				avatar = avatarFilename === 'Transcendaire.png' ? `/avatars/defaults/${avatarFilename}` : `/avatars/users/${avatarFilename}`
		}
		
		const newPlayer = createLobbyPlayer(playerId, playerName, false, false, avatar)

		lobby.players.push(newPlayer)
		this.socketTracker.trackSocket(socket, lobbyId, playerId)
		console.log(`[LOBBY] ${playerName} joined ${lobbyId}`)
		this.broadcastUpdates(lobby)
		return null
	}

	/**
	 * @brief Leave lobby
	 * @param socket Player's WebSocket
	 * @returns True if successfully left
	 */
	public leaveLobby(socket: WebSocket): boolean
	{
		const lobbyId = this.socketTracker.getLobbyId(socket)
		const playerId = this.socketTracker.getPlayerId(socket)

		if (!lobbyId || !playerId)
			return false
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby)
			return false
		this.socketTracker.untrackSocket(socket)
		this.removePlayerFromLobby(lobby, playerId)
		if (this.shouldDeleteLobby(lobby))
		{
			this.deleteLobbyInternal(lobbyId)
			return true
		}
		if (lobby.creatorId === playerId)
			this.transferOwnership(lobby)
		this.broadcastUpdates(lobby)
		console.log(`[LOBBY] Player left ${lobbyId}`)
		return true
	}

	/**
	 * @brief Add bot to lobby
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 * @returns Error message or null on success
	 */
	public addBot(socket: WebSocket, lobbyId: string): string | null
	{
		const error = this.validateOwnerAction(socket, lobbyId)

		if (error)
			return error
		const lobby = this.lobbies.get(lobbyId)!

		if (lobby.players.length >= lobby.maxPlayers)
			return "Lobby is full"
		this.addBotToLobby(lobby)
		this.broadcastUpdates(lobby)
		console.log(`[LOBBY] Bot added to ${lobbyId}`)
		return null
	}

	/**
	 * @brief Remove bot from lobby
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 * @param botId Bot ID to remove
	 * @returns Error message or null on success
	 */
	public removeBot(socket: WebSocket, lobbyId: string, botId: string): string | null
	{
		const error = this.validateOwnerAction(socket, lobbyId)

		if (error)
			return error
		const lobby = this.lobbies.get(lobbyId)!
		const botIndex = lobby.players.findIndex(p => p.id === botId && p.isBot)

		if (botIndex === -1)
			return "Bot not found"
		lobby.players.splice(botIndex, 1)
		this.broadcastUpdates(lobby)
		console.log(`[LOBBY] Bot ${botId} removed from ${lobbyId}`)
		return null
	}

	/**
	 * @brief Get non-bot player names from a lobby
	 * @param lobbyId Lobby ID
	 * @returns Array of player names (excluding bots)
	 */
	public getPlayerNamesInLobby(lobbyId: string): string[]
	{
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby)
			return []
		return lobby.players.filter(p => !p.isBot).map(p => p.name)
	}

	/**
	 * @brief Start lobby game
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 * @returns Error message or null on success
	 */
	public startLobby(socket: WebSocket, lobbyId: string): string | null
	{
		const error = this.validateStartConditions(socket, lobbyId)

		if (error)
			return error
		const lobby = this.lobbies.get(lobbyId)!

		if (lobby.type === 'tournament' && lobby.players.length % 2 !== 0)
			this.addBotToLobby(lobby)
		lobby.status = 'starting'
		console.log(`[LOBBY] Starting ${lobby.type} with ${lobby.players.length} players`)
		this.socketTracker.broadcastLobbyUpdate(lobby)

		const startError = lobby.type === 'tournament'
			? this.startService.startTournament(lobby)
			: (this.startService.startBattleRoyale(lobby), null)

		if (startError)
			return startError
		this.cleanupLobby(lobbyId)
		return null
	}

	/**
	 * @brief Delete lobby (owner only)
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 * @returns Error message or null on success
	 */
	public deleteLobby(socket: WebSocket, lobbyId: string): string | null
	{
		const error = this.validateOwnerAction(socket, lobbyId)

		if (error)
			return error
		this.socketTracker.notifyAndUntrackAll(lobbyId, {
			type: 'lobbyError', message: 'Lobby has been deleted by owner'
		})
		this.deleteLobbyInternal(lobbyId)
		console.log(`[LOBBY] Lobby ${lobbyId} deleted by owner`)
		return null
	}

	/**
	 * @brief Get all open lobbies
	 * @returns Array of lobbies with status 'waiting'
	 */
	public getOpenLobbies(): Lobby[]
	{
		return Array.from(this.lobbies.values()).filter(l => l.status === 'waiting')
	}

	/**
	 * @brief Get lobby by ID
	 * @param lobbyId Lobby identifier
	 * @returns Lobby or undefined
	 */
	public getLobby(lobbyId: string): Lobby | undefined
	{
		return this.lobbies.get(lobbyId)
	}

	/**
	 * @brief Handle socket disconnection
	 * @param socket Disconnected WebSocket
	 */
	public handleDisconnect(socket: WebSocket): void
	{
		this.leaveLobby(socket)
	}

	/**
	 * @brief Validate that socket is lobby owner
	 * @param socket WebSocket connection
	 * @param lobbyId Lobby identifier
	 * @returns Error message or null if valid
	 */
	private validateOwnerAction(socket: WebSocket, lobbyId: string): string | null
	{
		const playerId = this.socketTracker.getPlayerId(socket)
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby)
			return "Lobby not found"
		if (lobby.creatorId !== playerId)
			return "Only lobby owner can perform this action"
		return null
	}

	/**
	 * @brief Validate conditions for starting lobby
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 * @returns Error message or null if valid
	 */
	private validateStartConditions(socket: WebSocket, lobbyId: string): string | null
	{
		const ownerError = this.validateOwnerAction(socket, lobbyId)

		if (ownerError)
			return ownerError
		const lobby = this.lobbies.get(lobbyId)!

		if (lobby.players.length < 2)
			return "Need at least 2 players"
		if (lobby.players.length > 16)
			return "Maximum 16 players allowed"
		return null
	}

	/**
	 * @brief Add bot directly to lobby
	 * @param lobby Target lobby
	 */
	private addBotToLobby(lobby: Lobby): void
	{
		const botNumber = getNextBotNumber(lobby.players)
		const bot = createLobbyPlayer(generateBotId(), `Bot #${botNumber}`, true, true)

		lobby.players.push(bot)
	}

	/**
	 * @brief Remove player from lobby players array
	 * @param lobby Target lobby
	 * @param playerId Player to remove
	 */
	private removePlayerFromLobby(lobby: Lobby, playerId: string): void
	{
		const playerIndex = lobby.players.findIndex(p => p.id === playerId)

		if (playerIndex > -1)
			lobby.players.splice(playerIndex, 1)
	}

	/**
	 * @brief Check if lobby should be deleted
	 * @param lobby Target lobby
	 * @returns True if no human players remain
	 */
	private shouldDeleteLobby(lobby: Lobby): boolean
	{
		const humanPlayers = lobby.players.filter(p => !p.isBot)

		return lobby.players.length === 0 || humanPlayers.length === 0
	}

	/**
	 * @brief Delete lobby and cleanup tracking
	 * @param lobbyId Lobby to delete
	 */
	private deleteLobbyInternal(lobbyId: string): void
	{
		this.lobbies.delete(lobbyId)
		this.socketTracker.deleteLobby(lobbyId)
		this.socketTracker.broadcastLobbyListToAll()
	}

	/**
	 * @brief Cleanup lobby after game start
	 * @param lobbyId Lobby to cleanup
	 */
	private cleanupLobby(lobbyId: string): void
	{
		const sockets = this.socketTracker.getLobbySockets(lobbyId)

		if (sockets)
		{
			for (const sock of sockets)
				this.socketTracker.untrackSocket(sock)
		}
		this.lobbies.delete(lobbyId)
		this.socketTracker.deleteLobby(lobbyId)
		this.socketTracker.broadcastLobbyListToAll()
	}

	/**
	 * @brief Transfer lobby ownership to random remaining player
	 * @param lobby Target lobby
	 */
	private transferOwnership(lobby: Lobby): void
	{
		const nonBotPlayers = lobby.players.filter(p => !p.isBot)

		if (nonBotPlayers.length === 0)
			return
		const randomIndex = Math.floor(Math.random() * nonBotPlayers.length)
		const newOwner = nonBotPlayers[randomIndex]

		if (!newOwner)
			return
		lobby.creatorId = newOwner.id
		console.log(`[LOBBY] Ownership transferred to ${newOwner.name}`)
	}

	/**
	 * @brief Broadcast lobby update and list
	 * @param lobby Updated lobby
	 */
	private broadcastUpdates(lobby: Lobby): void
	{
		this.socketTracker.broadcastLobbyUpdate(lobby)
		this.socketTracker.broadcastLobbyListToAll()
	}
}
