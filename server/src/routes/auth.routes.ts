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
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24//*24 hours
		});

		db.setUserOnlineStatus(userId, true);

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
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60  * 24//* 24 hours
		})

		db.setUserOnlineStatus(user!.id, true);

		return res.code(200).send({
			success: true,
			message: 'Connexion réussie',
			alias: user!.alias
		})
	})


	server.post('/api/auth/logout', async (req, res) => {
		const user = (req as any).user;

		console.log(`user(logout route) is ${user}`)
		if (user && user.id)
			db.setUserOnlineStatus(user.id, false);

		res.clearCookie('user_id', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax'
		});
		req.cookies.id = "";
		return res.code(204).send();

	})

	server.get('/api/auth/me', async (req, res) => {

		const user = (req as any).user;
		
		console.log(`user: ${user}`);
		if (!user)
			return res.code(401).send({ alias: undefined });
		else
			return res.code(200).send({ alias: user.alias });
	})
}
