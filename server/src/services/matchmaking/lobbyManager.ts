import { WebSocket } from 'ws'
import { Player } from './types.js'

/**
 * @brief Lobby for multiplayer games (2-6 players) and tournaments
 */
export interface Lobby
{
	id: string
	name: string
	creatorId: string
	type: 'multiplayer' | 'tournament'
	maxPlayers: number
	isCustom: boolean
	players: Player[]
	status: 'waiting' | 'starting' | 'playing'
	createdAt: number
}

/**
 * @brief Manages game lobbies for multiplayer and tournaments
 * @details This will handle lobby creation, joining, and starting games with bots
 */
export class LobbyManager
{
	private lobbies: Map<string, Lobby> = new Map()

	/**
	 * @brief Create new lobby
	 * @param creator Creator player
	 * @param name Lobby name
	 * @param type Multiplayer or tournament
	 * @param maxPlayers Maximum players (2-6 for multiplayer, 4-16 for tournament)
	 * @param isCustom Enable power-ups
	 * @returns Created lobby ID
	 */
	public createLobby(creator: Player, name: string, type: 'multiplayer' | 'tournament', maxPlayers: number, isCustom: boolean): string
	{
		const lobbyId = Math.random().toString(36).substr(2, 9)
		const lobby: Lobby = {
			id: lobbyId,
			name,
			creatorId: creator.id,
			type,
			maxPlayers,
			isCustom,
			players: [creator],
			status: 'waiting',
			createdAt: Date.now()
		}
		this.lobbies.set(lobbyId, lobby)
		console.log(`[LOBBY] Created ${type} lobby "${name}" (${lobbyId}) - max ${maxPlayers} players`)
		return lobbyId
	}

	/**
	 * @brief Join existing lobby
	 * @param lobbyId Lobby to join
	 * @param player Player joining
	 * @returns True if successfully joined
	 */
	public joinLobby(lobbyId: string, player: Player): boolean
	{
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby)
			return false
		if (lobby.status !== 'waiting')
			return false
		if (lobby.players.length >= lobby.maxPlayers)
			return false
		lobby.players.push(player)
		console.log(`[LOBBY] ${player.name} joined lobby ${lobbyId} (${lobby.players.length}/${lobby.maxPlayers})`)
		return true
	}

	/**
	 * @brief Get all open lobbies
	 * @returns List of lobbies with status 'waiting'
	 */
	public getOpenLobbies(): Lobby[]
	{
		return Array.from(this.lobbies.values()).filter(l => l.status === 'waiting')
	}

	/**
	 * @brief Get lobby by ID
	 * @param lobbyId Lobby ID
	 * @returns Lobby or undefined
	 */
	public getLobby(lobbyId: string): Lobby | undefined
	{
		return this.lobbies.get(lobbyId)
	}

	/**
	 * @brief Remove player from lobby
	 * @param lobbyId Lobby ID
	 * @param playerId Player ID to remove
	 */
	public removePlayerFromLobby(lobbyId: string, playerId: string): void
	{
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby)
			return
		const index = lobby.players.findIndex(p => p.id === playerId)
		if (index > -1)
			lobby.players.splice(index, 1)
		if (lobby.players.length === 0 || playerId === lobby.creatorId)
		{
			console.log(`[LOBBY] Closing empty/creator-left lobby ${lobbyId}`)
			this.lobbies.delete(lobbyId)
		}
	}

	/**
	 * @brief Start game from lobby (will fill remaining slots with AI)
	 * @param lobbyId Lobby to start
	 * @returns True if game started successfully
	 */
	public startLobbyGame(lobbyId: string): boolean
	{
		const lobby = this.lobbies.get(lobbyId)
		if (!lobby || lobby.status !== 'waiting')
			return false
		lobby.status = 'starting'
		console.log(`[LOBBY] Starting ${lobby.type} game ${lobbyId} with ${lobby.players.length}/${lobby.maxPlayers} players`)
		return true
	}
}
