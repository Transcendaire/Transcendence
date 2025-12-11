import { FastifyInstance } from 'fastify'
import { MatchmakingService } from '../services/matchmaking/matchmaking.js'

const matchmaking = new MatchmakingService()

export async function registerWebSocketRoutes(server: FastifyInstance)
{
		server.get('/ws', { websocket: true }, (connection, req) => {

			const user = (req as any).user;
        
        	if (!user || !user.id)
			{
            	console.log('[WEBSOCKET] Unauthenticated connection attempt blocked');
            	connection.socket.close(1008, 'Veuillez vous connecter');
            	return;
        	}
        
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
}