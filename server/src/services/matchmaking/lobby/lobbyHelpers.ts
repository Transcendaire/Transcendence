import { WebSocket } from 'ws'
import { LobbyPlayer } from '@app/shared/types.js'

/**
 * @brief Generate unique player ID
 * @returns Unique player identifier string
 */
export function generatePlayerId(): string
{
	return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * @brief Generate unique lobby ID
 * @returns Unique lobby identifier string
 */
export function generateLobbyId(): string
{
	return `lobby-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * @brief Generate unique bot ID
 * @returns Unique bot identifier string
 */
export function generateBotId(): string
{
	return `bot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
}

/**
 * @brief Create a new LobbyPlayer object
 * @param id Player identifier
 * @param name Player display name
 * @param isBot Whether player is a bot
 * @param isReady Whether player is ready
 * @returns LobbyPlayer object
 */
export function createLobbyPlayer(id: string, name: string, isBot: boolean, isReady: boolean): LobbyPlayer
{
	return { id, name, isBot, isReady }
}

/**
 * @brief Get next available bot number for naming
 * @param players Current lobby players
 * @returns Next bot number (1, 2, 3...)
 */
export function getNextBotNumber(players: LobbyPlayer[]): number
{
	const existingNumbers = players
		.filter(p => p.isBot && p.name.startsWith('Bot #'))
		.map(p => parseInt(p.name.replace('Bot #', ''), 10))
		.filter(n => !isNaN(n))

	let botNumber = 1

	while (existingNumbers.includes(botNumber))
		botNumber++
	return botNumber
}

/**
 * @brief Build player ID to socket mapping from lobby sockets
 * @param sockets Set of sockets in lobby
 * @param socketToPlayerId Map of socket to player ID
 * @returns Map of player ID to socket
 */
export function buildPlayerSocketMap(
	sockets: Set<WebSocket> | undefined,
	socketToPlayerId: Map<WebSocket, string>
): Map<string, WebSocket>
{
	const playerIdToSocket = new Map<string, WebSocket>()

	if (!sockets)
		return playerIdToSocket
	for (const sock of sockets)
	{
		const playerId = socketToPlayerId.get(sock)

		if (playerId)
			playerIdToSocket.set(playerId, sock)
	}
	return playerIdToSocket
}

/**
 * @brief Find socket for a specific player in lobby
 * @param sockets Set of sockets in lobby
 * @param socketToPlayerId Map of socket to player ID
 * @param targetPlayerId Player ID to find
 * @returns WebSocket or undefined
 */
export function findPlayerSocket(
	sockets: Set<WebSocket> | undefined,
	socketToPlayerId: Map<WebSocket, string>,
	targetPlayerId: string
): WebSocket | undefined
{
	if (!sockets)
		return undefined
	for (const sock of sockets)
		if (socketToPlayerId.get(sock) === targetPlayerId)
			return sock
	return undefined
}
