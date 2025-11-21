import { FastifyInstance } from "fastify"
import { getDatabase } from '../db/databaseSingleton.js'
import { hashPassword, verifyPassword } from "src/utils/crypto"

export async function registerAuthRoutes(server: FastifyInstance)
{
	const db = getDatabase();

	server.post<{ Body: {
		login: string;
		password: string;
		publicLogin: string
	}
	}>('api/auth/register', async (req, res) => {

		const { login, password, publicLogin } = req.body;
	})
}