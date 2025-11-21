import { FastifyInstance } from 'fastify'
import { MatchmakingService } from '../services/matchmaking/matchmaking.js'

const matchmaking = new MatchmakingService()

export async function registerWebSocketRoutes(server: FastifyInstance) //! changd the logic to not use register
{
	// server.register(async function (fastify) {
		server.get('/ws', { websocket: true }, (connection, req) => {
			const ws = connection.socket

			ws.on('message', (message) =>
			{
				try {
					const data = JSON.parse(message.toString());
					matchmaking.handleMessage(ws, data);
				} catch (error) {
					console.error("Error on WebSocket message : ", error);
				}
			})

			ws.on('close', () =>
			{
				matchmaking.removePlayer(ws);
			})
		})
	// })
}