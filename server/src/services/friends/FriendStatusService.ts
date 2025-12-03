import { WebSocket } from 'ws'
import { FriendStatus, PlayerOnlineStatus, OnlinePlayer } from '../../types.js'
import { sendMessage } from '../../utils/websocket.js'
import { getDatabase } from '../../db/databaseSingleton.js'

type GameCheckFn = (playerName: string) => boolean

/**
 * @brief Service for managing friend status updates
 * @details Handles broadcasting status changes to friends and providing
 * friend/online player lists with real-time status information
 */
export class FriendStatusService
{
	private playerNameToSocket: Map<string, WebSocket>
	private isPlayerInGame: GameCheckFn

	constructor(
		playerNameToSocket: Map<string, WebSocket>,
		isPlayerInGame: GameCheckFn
	)
	{
		this.playerNameToSocket = playerNameToSocket
		this.isPlayerInGame = isPlayerInGame
	}

	/**
	 * @brief Get player status based on connection and game state
	 * @param playerName Player's name
	 * @returns 'offline', 'online', or 'in-game'
	 */
	public getPlayerStatus(playerName: string): PlayerOnlineStatus
	{
		const socket = this.playerNameToSocket.get(playerName)
		if (!socket || socket.readyState !== socket.OPEN)
			return 'offline'
		if (this.isPlayerInGame(playerName))
			return 'in-game'
		return 'online'
	}

	/**
	 * @brief Broadcast player status change to all friends
	 * @param playerName Player whose status changed
	 * @param status New status
	 */
	public broadcastStatus(playerName: string, status: PlayerOnlineStatus): void
	{
		if (!playerName || playerName === 'Anonymous')
			return
		const db = getDatabase()
		const dbFriends = db.getFriendsWithAlias(playerName)
		const update: FriendStatus = {
			id: 0,
			alias: playerName,
			status: status,
			since: ''
		}
		for (const friend of dbFriends)
		{
			const friendSocket = this.playerNameToSocket.get(friend.alias)
			if (friendSocket && friendSocket.readyState === friendSocket.OPEN)
				sendMessage(friendSocket, { type: 'friendStatusUpdate', friend: update })
		}
		console.log(`[FRIENDS] Broadcast ${status} for ${playerName} to ${dbFriends.length} friends`)
	}

	/**
	 * @brief Get friend list with current status for a player
	 * @param playerName Requesting player's name
	 * @returns Array of friends with status
	 */
	public getFriendList(playerName: string): FriendStatus[]
	{
		const db = getDatabase()
		const dbFriends = db.getFriendsWithAlias(playerName)
		return dbFriends.map((f: { id: number; alias: string; since: string }) => ({
			id: f.id,
			alias: f.alias,
			status: this.getPlayerStatus(f.alias),
			since: f.since
		}))
	}

	/**
	 * @brief Get list of online players with friend status
	 * @param playerName Requesting player's name
	 * @returns Array of online players sorted by friend status
	 */
	public getOnlinePlayersList(playerName: string): OnlinePlayer[]
	{
		const db = getDatabase()
		const dbFriends = db.getFriendsWithAlias(playerName)
		const friendAliases = new Set(dbFriends.map((f: { alias: string }) => f.alias))
		const players: OnlinePlayer[] = []
		for (const [name, sock] of this.playerNameToSocket)
		{
			if (name === playerName || name === 'Anonymous' || sock.readyState !== sock.OPEN)
				continue
			players.push({
				alias: name,
				status: this.getPlayerStatus(name),
				isFriend: friendAliases.has(name)
			})
		}
		players.sort((a, b) => {
			if (a.isFriend !== b.isFriend)
				return a.isFriend ? -1 : 1
			return a.alias.localeCompare(b.alias)
		})
		return players
	}
}
