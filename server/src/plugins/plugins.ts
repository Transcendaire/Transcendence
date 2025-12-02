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

    await server.register(fastifyStatic, {
        root: paths.avatars,
        prefix: '/avatars/',
        decorateReply: false
    })


	server.addHook('preHandler', async (req: FastifyRequest, res: FastifyReply ) => {
		const id = req.cookies.user_id;
		if (!id)
			return ;
		const user = db.getUserById(id);
		if (user)
			req.user = user;
		else
		{
			res.clearCookie('user_id', {
				path: '/',
				httpOnly: true,
				sameSite: 'lax'
			});
			req.cookies.id = "";
		}
	})


}

