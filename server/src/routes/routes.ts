import { FastifyInstance } from 'fastify'
import { registerAuthRoutes } from './auth.routes.js'
import { registerWebSocketRoutes } from './websocket.routes.js'
import { registerStaticRoutes } from './static.routes.js'

export async function registerRoutes(server: FastifyInstance)
{
    await registerAuthRoutes(server)
    
    await registerWebSocketRoutes(server)
    
    await registerStaticRoutes(server)
}