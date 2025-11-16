import fastify from 'fastify'
import websocket from '@fastify/websocket'
import { MatchmakingService } from './services/matchmaking.js'

(async () => {
  const server = fastify({
    logger: true
  })
  const matchmaking = new MatchmakingService()
  
  console.log('Starting server in Docker mode...')
  
  await server.register(websocket)
  
  server.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      const ws = connection.socket
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString())
          matchmaking.handleMessage(ws, data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      })
      ws.on('close', () => {
        matchmaking.removePlayer(ws)
      })
    })
  })
  
  server.get('/health', async (request, reply) => {
    return { status: 'ok', service: 'transcendence-server' }
  })
  
  try {
    await server.listen({ port: 8080, host: '0.0.0.0' })
    console.log('Server listening on port 8080')
  } catch (err) {
    console.error('Server error:', err)
    process.exit(1)
  }
})()
