import fastify from 'fastify'
import websocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import { MatchmakingService } from './services/matchmaking.js'
import fs from 'fs'

(async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const server = fastify({
    logger: true // Enable logging
  })
  const matchmaking = new MatchmakingService()
  const publicPath = path.join(__dirname, '../../client/public')
  const distPath = path.join(__dirname, '../../client/dist')
  const indexPath = path.join(publicPath, 'index.html')
  
  // Debug the correct paths
  console.log('Current directory:', process.cwd())
  console.log('__dirname:', __dirname)
  console.log('Public path:', publicPath)
  console.log('Index path:', indexPath)
  
  // Register WebSocket plugin
  await server.register(websocket)
  
  // Plugin pour que le serveur puisse serve des fichiers statics
  await server.register(fastifyStatic, {
    root: publicPath,
    prefix: '/',
    index: false
  })
  
  // await server.register(fastifyStatic, {
  //   root: distPath,
  //   prefix: '/dist',
  //   decorateReply: false,
  //   index: false
  // })
  
  // WebSocket endpoint for the game
  server.register(async function (fastify) {
    fastify.get('/game', { websocket: true }, (connection, req) => {
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
  
  // Serve index.html for the root path
  server.get('/', async (request, reply) => {
    console.log('Serving root path')
    try {
      const content = await fs.promises.readFile(indexPath, 'utf8')
      return reply.type('text/html').send(content)
    } catch (err) {
      console.error(`Error reading index.html: ${err}`)
      return reply.code(500).send('Internal Server Error')
    }
  })
  
  server.setNotFoundHandler((request, reply) => {
    console.log(`NotFound handler for: ${request.url}`)
    
    // Skip API routes
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'API endpoint not found' })
    }
    
    // Skip WebSocket route
    if (request.url === '/game') {
      return reply.code(404).send({ error: 'WebSocket endpoint not found' })
    }

    // Skip les fichiers statiques (JS, CSS, images, etc.)
    if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf)$/)) {
      return reply.code(404).send('File not found')
    }
    
    // For all other routes, serve the index.html file
    return fs.promises.readFile(indexPath, 'utf8')
      .then(content => {
        return reply.type('text/html').send(content)
      })
      .catch(err => {
        console.error(`Error reading index.html: ${err}`)
        return reply.code(500).send('Internal Server Error')
      })
  })
  
  // Start the server
  try {
    await server.listen({ port: 8080, host: '0.0.0.0' })
    console.log('Server listening on port 8080')
  } catch (err) {
    console.error('Server error:', err)
    process.exit(1)
  }
})()