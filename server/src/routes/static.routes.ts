import { FastifyInstance } from 'fastify'
import fs from 'fs'
import { paths } from '../config/paths.js'



export async function registerStaticRoutes(server: FastifyInstance)
{
	server.get('/', async (request, reply) => {
		console.log('Serving root path')
		try {
            const content = await fs.promises.readFile(paths.index, 'utf8')
            return reply.type('text/html').send(content)
        } catch (err) {
            console.error('Error reading index.html:', err)
            return reply.code(500).send('Erreur interne du serveur')
        }
    })
    
    server.setNotFoundHandler( async (request, reply) => {
        console.log(`NotFound handler for: ${request.url}`)
        
        if (request.url.startsWith('/api/')) {
            return reply.code(404).send({ error: 'Adresse introuvable' })
        }
        
        if (request.url === '/ws') {
            return reply.code(404).send({ error: 'WebSocket introuvable' })
        }

        if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf)$/)) {
            return reply.code(404).send('Fichier introuvable')
        }
        
        const validRoutes = ['/', '/home', '/lobby', '/game', '/profile', '/friends'];
        const pathname = new URL(request.url, `https://${request.headers.host}`).pathname;
        
        if (validRoutes.includes(pathname)) {
            try {
                const content = await fs.promises.readFile(paths.index, 'utf8')
                return reply.type('text/html').send(content)
            } catch (err) {
                console.error('❌ Error reading index.html:', err)
                return reply.code(500).send('Erreur interne du serveur')
            }
        }

    })
}