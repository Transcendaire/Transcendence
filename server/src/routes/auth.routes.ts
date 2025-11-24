import { FastifyInstance } from "fastify"
import { getDatabase } from '../db/databaseSingleton.js'
import { hashPassword, verifyPassword } from "../utils/passwords.js"
import { checkForDuplicatesAtRegistering, validateRegistering } from "../validators/auth.validator.js";
import { validateLoggingIn } from "../validators/auth.validator.js";

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

		// db.setUserOnlineStatus(userId, true);

		return res.code(201).send({
			success: true,
			message: 'Utilisateur créé avec succès'
		});
	})


	server.post('/api/auth/login', async (req, res) => {

		console.log('Login request received with body:', req.body);
		validateLoggingIn(req.body);
		const { login, password } = req.body as any;
		const user = db.getUserByLogin(login);
		console.log('Validation passed for login:', login);

		res.setCookie('user_id', user!.id, {
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 60 * 60 //* 1 hour
		})

		return res.code(200).send({
			success: true,
			message: 'Connexion réussie',
			alias: user!.alias
		})
	})
}
