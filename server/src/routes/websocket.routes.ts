import { FastifyInstance } from 'fastify'
import { MatchmakingService } from '../services/matchmaking/matchmaking.js'

const matchmaking = new MatchmakingService()

/**
 * @brief Register WebSocket routes with authentication
 * @param server Fastify instance
 */
export async function registerWebSocketRoutes(server: FastifyInstance)
{
	server.get('/ws', { websocket: true }, (connection, req) => {
		const user = (req as any).user
		const sessionId = req.cookies.session_id

		if (!user || !user.id)
		{
			console.log('[WEBSOCKET] Unauthenticated connection attempt blocked')
			connection.socket.close(1008, 'Veuillez vous connecter')
			return
		}
		const ws = connection.socket

		matchmaking.registerAuthenticatedSocket(ws, user.id, sessionId)
		ws.on('message', (message) =>
		{
			try
			{
				const data = JSON.parse(message.toString())
				matchmaking.handleMessage(ws, data)
			}
			catch (error)
			{
				console.error("Error on WebSocket message : ", error)
			}
		})
		ws.on('close', () =>
		{
			matchmaking.removePlayer(ws)
		})
	})
}