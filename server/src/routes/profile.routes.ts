import { FastifyInstance } from "fastify";
import { getDatabase } from '../db/databaseSingleton.js'

export async function registerProfileRoutes(server: FastifyInstance)
{
	server.get('/api/profile/me', async (req, res) => {

	})

	server.get('/api/profile/stats', async (req, res) => {
		
	})
}