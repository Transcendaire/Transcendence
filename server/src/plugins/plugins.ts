import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import websocket from '@fastify/websocket'
import fastifyMultipart from '@fastify/multipart'
import fastifyCookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import { paths } from '../config/paths.js'
import { getDatabase } from '../db/databaseSingleton.js'

declare module 'fastify' {
	export interface FastifyRequest {
		user?: any;
	}
}

export async function registerPlugins(server: FastifyInstance)
{
	const db = getDatabase();

	await server.register(fastifyCookie)

	await server.register(websocket);


	console.log('[PLUGINS] Registering multipart with limits:', {
        fileSize: 5 * 1024 * 1024,
        files: 1
    });

	await server.register(fastifyMultipart, {
		limits: {
			fileSize: 5 * 1024 * 1024,
			files: 1
		}
	});

	await server.register(fastifyStatic, {
		root: paths.public,
		prefix: '/',
		index: false
	})

	await server.register(fastifyStatic, {
		root: paths.dist,
		prefix: '/dist/',
		index: false,
		decorateReply: false
	})

	console.log('[PLUGINS] Registering avatar static route:', {
        root: paths.avatars,
        prefix: '/avatars/'
    });

    await server.register(fastifyStatic, {
        root: paths.avatars,
        prefix: '/avatars/',
        decorateReply: false
    })

	server.addHook('preHandler', async (req: FastifyRequest, res: FastifyReply ) => {
		const sessionId = req.cookies.session_id;
		if (!sessionId)
			return ;

		const user = db.getUserBySessionId(sessionId);

		if (user)
			req.user = user;
		else
		{
			res.clearCookie('session_id', {
				path: '/',
				httpOnly: true,
				sameSite: 'lax'
			});
			// req.cookies.id = "";//!changed
		}
	})


}

