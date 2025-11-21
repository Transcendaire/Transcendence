import { FastifyInstance } from "fastify"
import { getDatabase } from '../db/databaseSingleton.js'
import { hashPassword, verifyPassword } from "../utils/crypto.js"
import { checkForDuplicatesAtRegistering, validateRegistering } from "../validators/auth.validator.js";

export async function registerAuthRoutes(server: FastifyInstance)
{
	const db = getDatabase();

	server.post('/api/auth/register', async (req, res) => {

		validateRegistering(req.body);
		const { login, password, passwordValidation, alias } = req.body as any;

		checkForDuplicatesAtRegistering(login, alias);

		const hashedPassword = hashPassword(password);
		const userId = db.createUser(login, hashedPassword, alias);

		res.setCookie('user_id', userId, {
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 //*1 hour
		});

		return res.code(201).send({
			success: true,
			message: 'Utilisateur créé avec succès'
		});
	})
}