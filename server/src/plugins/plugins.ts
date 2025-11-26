import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import websocket from '@fastify/websocket'
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

	await server.register(fastifyCookie, { //*are cookies needed?
		secret: process.env.COOKIE_SECRET || 'add an env variable for cookie secret'
	})

	await server.register(websocket);

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

