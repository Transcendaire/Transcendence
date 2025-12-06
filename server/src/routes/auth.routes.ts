import { FastifyInstance } from "fastify"
import { getDatabase } from '../db/databaseSingleton.js'
import { hashPassword, verifyPassword } from "../utils/passwords.js"
import { checkForDuplicatesAtRegistering, validateRegistering } from "../validators/auth.validator.js";
import { validateLoggingIn } from "../validators/auth.validator.js";
import { validateGoogleToken } from "../validators/auth.validator.js";

export async function registerAuthRoutes(server: FastifyInstance) {
	const db = getDatabase();

	server.post('/api/auth/register', async (req, res) => {

		validateRegistering(req.body);
		const { login, password, passwordValidation, alias } = req.body as any;

		checkForDuplicatesAtRegistering(login, alias);

		const hashedPassword = hashPassword(password);
		const userId = db.createUser(login, hashedPassword, alias);

		const sessionId = db.createOrUpdateSession(userId);

		res.setCookie('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 //*24 hours
		});

		db.setUserOnlineStatus(userId, true);

		return res.code(201).send({
			success: true,
			message: 'Utilisateur créé avec succès'
		});
	})


	server.post('/api/auth/login', async (req, res) => {

		validateLoggingIn(req.body);
		const { login, password } = req.body as any;
		const user = db.getUserByLogin(login);

		const sessionId = db.createOrUpdateSession(user!.id);

		res.setCookie('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24//* 24 hours
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

		if (user && user.id)
		{
			db.setUserOnlineStatus(user.id, false);
			db.deleteSession(user.id);
		}

		res.clearCookie('session_id', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax'
		});
		// req.cookies.id = "";//!changed
		return res.code(204).send();

	})

	server.get('/api/auth/me', async (req, res) => {

		const user = (req as any).user;

		console.log(`user: ${user.alias}`);
		if (!user)
			return res.code(401).send({ alias: undefined });
		else
			return res.code(200).send({ alias: user.alias });
	})

	server.post('/api/auth/google', async (req, res) => {
		const { credential } = req.body as { credential?: string };

		const data = await validateGoogleToken(credential);

		let user = db.getUserByLogin(data.email)

		if (!user)
		{
			console.log('[AUTH] 🆕 Création utilisateur...');

			const uniqueAlias = db.generateUniqueAlias(data.name);

			const randomPassword = Math.random().toString(36).slice(-16);
			const hashedPassword = hashPassword(randomPassword);

			const userId = db.createUser(data.email, hashedPassword, uniqueAlias);
			user = db.getUserById(userId);

			console.log('[AUTH] ✅ Utilisateur créé:', user?.alias);
		}
		else
			console.log('[AUTH] 👋 Utilisateur existant:', user.alias);

		const sessionId = db.createOrUpdateSession(user!.id);

		res.setCookie('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 //*24 hours
		});

		db.setUserOnlineStatus(user!.id, true);

		return res.code(200).send({
            success: true,
            id: user!.id,
            email: data.email,
            alias: user!.alias,
            picture: data.picture || null,
            message: 'Connexion Google réussie'
        });
	})
}
