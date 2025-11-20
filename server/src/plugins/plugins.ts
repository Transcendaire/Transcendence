import { FastifyInstance } from 'fastify'
import websocket from '@fastify/websocket'
import fastifyCookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import { paths } from '../config/paths.js'

export async function registerPlugins(server: FastifyInstance)
{
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
}