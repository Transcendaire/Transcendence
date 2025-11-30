import { WebSocket } from 'ws'
import { Lobby, LobbyPlayer, CustomGameSettings } from '@app/shared/types.js'
import { GameRoomManager } from './gameRoom.js'
import { TournamentManagerService } from '../tournament/tournamentManager.js'

/**
 * @brief Manages custom game lobbies for 2-16 players
 * @details Handles lobby creation, player management, bot addition,
 * ownership transfer, and game start with strict security checks
 */
export class LobbyManager
{
	private lobbies: Map<string, Lobby> = new Map()
	private socketToLobby: Map<WebSocket, string> = new Map()
	private lobbyToSockets: Map<string, Set<WebSocket>> = new Map()
	private socketToPlayerId: Map<WebSocket, string> = new Map()
	private gameRoomManager: GameRoomManager
	private allSockets: Map<WebSocket, any>
	private tournamentManager: TournamentManagerService

	constructor(gameRoomManager: GameRoomManager, allSockets: Map<WebSocket, any>, tournamentManager: TournamentManagerService)
	{
		this.gameRoomManager = gameRoomManager
		this.allSockets = allSockets
		this.tournamentManager = tournamentManager
	}

	/**
	 * @brief Create new custom lobby
	 * @param socket Creator's WebSocket connection
	 * @param playerName Creator's name
	 * @param lobbyName Lobby display name
	 * @param lobbyType Type of lobby (tournament or battleroyale)
	 * @param settings Game settings
	 * @returns Created lobby ID or null if player already in lobby
	 */
	public createLobby(
		socket: WebSocket,
		playerName: string,
		lobbyName: string,
		lobbyType: 'tournament' | 'battleroyale',
		maxPlayers: number,
		settings: CustomGameSettings
	): string | null
	{
		const playerId = this.socketToPlayerId.get(socket) || 
			`player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

		if (this.socketToLobby.has(socket))
			return null;
		const lobbyId = `lobby-${Date.now()}-${Math.random().toString(36)
			.substr(2, 9)}`
		const creatorPlayer: LobbyPlayer = {
			id: playerId,
			name: playerName,
			isBot: false,
			isReady: true
		}
		const lobby: Lobby = {
			id: lobbyId,
			creatorId: playerId,
			name: lobbyName,
			type: lobbyType,
			settings: settings,
			players: [creatorPlayer],
			maxPlayers: maxPlayers,
			status: 'waiting',
			createdAt: Date.now()
		}

		this.lobbies.set(lobbyId, lobby)
		this.trackSocket(socket, lobbyId, playerId)
		console.log(`[LOBBY] Created ${lobbyType} lobby "${lobbyName}" (${lobbyId}) by ${playerName}, maxPlayers: ${maxPlayers}, powerUps: ${settings.powerUpsEnabled}`)
		this.broadcastLobbyListToAll()
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
		socket: WebSocket,
		playerName: string,
		lobbyId: string
	): string | null
	{
		const playerId = this.socketToPlayerId.get(socket) || 
			`player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

		if (this.socketToLobby.has(socket))
			return "You are already in a lobby"
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby)
			return "Lobby not found"
		if (lobby.status !== 'waiting')
			return "Lobby already started"
		if (lobby.players.length >= lobby.maxPlayers)
			return "Lobby is full"
		const newPlayer: LobbyPlayer = {
			id: playerId,
			name: playerName,
			isBot: false,
			isReady: false
		}

		lobby.players.push(newPlayer)
		this.trackSocket(socket, lobbyId, playerId)
		console.log(`[LOBBY] ${playerName} joined ${lobbyId} (${lobby.players
			.length}/${lobby.maxPlayers})`)
		this.broadcastLobbyUpdate(lobby)
		this.broadcastLobbyListToAll()
		return null
	}

	/**
	 * @brief Leave lobby
	 * @param socket Player's WebSocket
	 * @returns True if successfully left
	 */
	public leaveLobby(socket: WebSocket): boolean
	{
		const lobbyId = this.socketToLobby.get(socket)
		const playerId = this.socketToPlayerId.get(socket)

		if (!lobbyId || !playerId)
			return false
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby)
			return false
		this.untrackSocket(socket)
		const playerIndex = lobby.players.findIndex(p => p.id === playerId)

		if (playerIndex > -1)
			lobby.players.splice(playerIndex, 1)
		const humanPlayers = lobby.players.filter(p => !p.isBot)
		if (lobby.players.length === 0 || humanPlayers.length === 0)
		{
			console.log(`[LOBBY] Deleting lobby ${lobbyId} (no human players remaining)`)
			this.lobbies.delete(lobbyId)
			this.lobbyToSockets.delete(lobbyId)
			this.broadcastLobbyListToAll()
			return true
		}
		if (lobby.creatorId === playerId)
			this.transferOwnership(lobby)
		this.broadcastLobbyUpdate(lobby)
		this.broadcastLobbyListToAll()
		console.log(`[LOBBY] Player ${playerId} left ${lobbyId}`)
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
		const playerId = this.socketToPlayerId.get(socket)
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby)
			return "Lobby not found"
		if (lobby.creatorId !== playerId)
			return "Only lobby owner can add bots"
		if (lobby.players.length >= lobby.maxPlayers)
			return "Lobby is full"
		this.addBotToLobby(lobby)
		this.broadcastLobbyUpdate(lobby)
		this.broadcastLobbyListToAll()
		console.log(`[LOBBY] Bot added to ${lobbyId} (${lobby.players.length}/${lobby.maxPlayers})`)
		return null
	}

	/**
	 * @brief Remove bot from lobby
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 * @param botId Bot ID to remove
	 * @returns Error message or null on success
	 */
	public removeBot(
		socket: WebSocket,
		lobbyId: string,
		botId: string
	): string | null
	{
		const playerId = this.socketToPlayerId.get(socket)
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby)
			return "Lobby not found"
		if (lobby.creatorId !== playerId)
			return "Only lobby owner can remove bots"
		const botIndex = lobby.players.findIndex(p => p.id === botId && 
			p.isBot)

		if (botIndex === -1)
			return "Bot not found"
		lobby.players.splice(botIndex, 1)
		this.broadcastLobbyUpdate(lobby)
		this.broadcastLobbyListToAll()
		console.log(`[LOBBY] Bot ${botId} removed from ${lobbyId}`)
		return null
	}

	/**
	 * @brief Add bot directly to lobby
	 * @param lobby Target lobby
	 */
	private addBotToLobby(lobby: Lobby): void
	{
		const botCount = lobby.players.filter(p => p.isBot).length
		const botId = `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
		const bot: LobbyPlayer = {
			id: botId,
			name: `Bot #${botCount + 1}`,
			isBot: true,
			isReady: true
		}

		lobby.players.push(bot)
	}

	/**
	 * @brief Start lobby game
	 * @param socket Requester's WebSocket
	 * @param lobbyId Target lobby ID
	 * @returns Error message or null on success
	 */
	public startLobby(socket: WebSocket, lobbyId: string): string | null
	{
		const playerId = this.socketToPlayerId.get(socket)
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby)
			return "Lobby not found"
		if (lobby.creatorId !== playerId)
			return "Only lobby owner can start game"
		if (lobby.players.length < 2)
			return "Need at least 2 players"
		if (lobby.type === 'tournament' && lobby.players.length > 16)
			return "Maximum 16 players for tournaments"
		if (lobby.type === 'battleroyale' && lobby.players.length > 16)
			return "Maximum 16 players allowed"
		if (lobby.type === 'tournament' && lobby.players.length % 2 !== 0)
			this.addBotToLobby(lobby)
		
		lobby.status = 'starting'
		console.log(`[LOBBY] Starting ${lobby.type} ${lobbyId} with ${lobby.players.length} players`)
		this.broadcastLobbyUpdate(lobby)
		
		if (lobby.type === 'tournament')
		{
			try {
				const uniqueTournamentName = `${lobby.name}-${Date.now()}`
				const tournamentId = this.tournamentManager.createTournament(uniqueTournamentName, lobby.players.length, lobby.settings)
				const tournament = this.tournamentManager.getTournament(tournamentId)
				
				if (!tournament)
					return "Failed to create tournament"
				
				const sockets = this.lobbyToSockets.get(lobbyId)
				console.log(`[LOBBY] Adding ${lobby.players.length} players to tournament`)
				for (const player of lobby.players)
				{
					if (player.isBot)
					{
						console.log(`[LOBBY] Adding bot ${player.name} with id: ${player.id}`)
						tournament.addBotToTournament(player.id, player.name)
					}
					else
					{
						let playerSocket: WebSocket | undefined
						if (sockets)
						{
							for (const sock of sockets)
							{
								const sockPlayerId = this.socketToPlayerId.get(sock)
								if (sockPlayerId === player.id)
								{
									playerSocket = sock
									break
								}
							}
						}
						console.log(`[LOBBY] Adding player ${player.name} with socket: ${playerSocket ? 'YES' : 'NO'}`)
						tournament.addPlayerToTournament(player.name, playerSocket)
					}
				}
				console.log(`[LOBBY] All players added, starting tournament`)
				tournament.runTournament()
				console.log(`[LOBBY] Tournament ${tournamentId} started with ${lobby.players.length} players`)
			} catch (error) {
				console.error(`[LOBBY] Failed to start tournament:`, error)
				return "Failed to start tournament"
			}
		}
		else
		{
			const sockets = this.lobbyToSockets.get(lobbyId)
			const playerIdToSocket = new Map<string, WebSocket>()
			if (sockets)
			{
				for (const sock of sockets)
				{
					const playerId = this.socketToPlayerId.get(sock)
					if (playerId)
						playerIdToSocket.set(playerId, sock)
				}
			}
			this.gameRoomManager.createBattleRoyaleGame(
				lobby.players,
				playerIdToSocket,
				lobby.settings.powerUpsEnabled,
				lobby.settings.fruitFrequency,
				lobby.settings.lifeCount
			)
			console.log(`[LOBBY] Battle Royale game started with ${lobby.players.length} players`)
		}
		const sockets = this.lobbyToSockets.get(lobbyId)
		if (sockets)
		{
			for (const sock of sockets)
				this.untrackSocket(sock)
		}
		this.lobbies.delete(lobbyId)
		this.lobbyToSockets.delete(lobbyId)
		this.broadcastLobbyListToAll()
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
		const playerId = this.socketToPlayerId.get(socket)
		const lobby = this.lobbies.get(lobbyId)

		if (!lobby)
			return "Lobby not found"
		if (lobby.creatorId !== playerId)
			return "Only lobby owner can delete lobby"
		
		const sockets = this.lobbyToSockets.get(lobbyId)
		if (sockets)
		{
			const message = JSON.stringify({
				type: 'lobbyError',
				message: 'Lobby has been deleted by owner'
			})
			for (const sock of sockets)
			{
				if (sock.readyState === WebSocket.OPEN)
					sock.send(message)
				this.untrackSocket(sock)
			}
		}

		this.lobbies.delete(lobbyId)
		this.lobbyToSockets.delete(lobbyId)
		console.log(`[LOBBY] Lobby ${lobbyId} deleted by owner`)
		this.broadcastLobbyListToAll()
		return null
	}

	/**
	 * @brief Get all open lobbies
	 * @returns Array of lobbies with status 'waiting'
	 */
	public getOpenLobbies(): Lobby[]
	{
		return Array.from(this.lobbies.values()).filter(l => l.status === 
			'waiting')
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
		console.log(`[LOBBY] Ownership transferred to ${newOwner.name} in ${lobby.id}`)
	}

	/**
	 * @brief Track socket association with lobby
	 * @param socket WebSocket connection
	 * @param lobbyId Lobby identifier
	 * @param playerId Player identifier
	 */
	private trackSocket(
		socket: WebSocket,
		lobbyId: string,
		playerId: string
	): void
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
	private untrackSocket(socket: WebSocket): void
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
	 * @brief Broadcast lobby update to all members
	 * @param lobby Lobby to broadcast
	 */
	private broadcastLobbyUpdate(lobby: Lobby): void
	{
		const sockets = this.lobbyToSockets.get(lobby.id)

		if (!sockets)
			return
		for (const socket of sockets)
			this.sendMessage(socket, { type: 'lobbyUpdate', lobby: lobby })
	}

	/**
	 * @brief Broadcast lobby list to all connected clients
	 * @details Sends updated lobby list after creation/deletion/changes
	 */
	private broadcastLobbyListToAll(): void
	{
		const lobbies = this.getOpenLobbies()

		console.log(`[LOBBY] Broadcasting lobby list to ${this.allSockets.size} clients`)
		for (const socket of this.allSockets.keys())
			this.sendMessage(socket, { type: 'lobbyList', lobbies: lobbies })
	}

	/**
	 * @brief Send message to specific socket
	 * @param socket Target WebSocket
	 * @param message Message object
	 */
	private sendMessage(socket: WebSocket, message: any): void
	{
		if (socket.readyState === WebSocket.OPEN)
			socket.send(JSON.stringify(message))
	}
}
