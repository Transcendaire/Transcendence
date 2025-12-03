import { FastifyInstance } from "fastify"
import { getDatabase } from '../db/databaseSingleton.js'
import { hashPassword, verifyPassword } from "../utils/passwords.js"
import { checkForDuplicatesAtRegistering, validateRegistering } from "../validators/auth.validator.js";
import { validateLoggingIn } from "../validators/auth.validator.js";

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

		console.log(`user: ${user}`);
		if (!user)
			return res.code(401).send({ alias: undefined });
		else
			return res.code(200).send({ alias: user.alias });
	})

	server.post('/api/auth/google', async (req, res) => {
		const { credential } = req.body as { credential?: string };

		if (!credential) {
			return res.code(400).send({
				error: 'Token manquant',
				success: false
			});
		}

		try {
			console.log('[AUTH] 🔍 Vérification du token auprès de Google...');

			const googleResponse = await fetch(
				`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
			);

			if (!googleResponse.ok) {
				console.error('[AUTH] ❌ Token rejeté par Google');
				return res.code(401).send({
					error: 'Token invalide',
					success: false
				});
			}

			const payload = await googleResponse.json();

			console.log('[AUTH] ✅ Token vérifié');

			const expectedClientId = "782178545544-31i17kv4fli13eqj7o0l4dclqnbb3hql.apps.googleusercontent.com";

			if (payload.aud !== expectedClientId) {
				console.error('[AUTH] ❌ Token pas pour cette application');
				return res.code(401).send({
					error: 'Token invalide',
					success: false
				});
			}

			const email = payload.email;
			const name = payload.name || email?.split('@')[0] || 'User';
			const picture = payload.picture;

			console.log('[AUTH]    - Email:', email);
			console.log('[AUTH]    - Nom:', name);

			if (!email) {
				return res.code(400).send({ error: 'Email manquant' });
			}

			let user = db.getUserByLogin(email);

			if (!user) {
				console.log('[AUTH] 🆕 Création utilisateur...');

				const randomPassword = Math.random().toString(36).slice(-16);
				const hashedPassword = hashPassword(randomPassword);

				const userId = db.createUser(email, hashedPassword, name);//!fix (add 1 if alias already exists....)
				user = db.getUserById(userId);

				console.log('[AUTH] ✅ Utilisateur créé:', user?.alias);
			} else {
				console.log('[AUTH] 👋 Utilisateur existant:', user.alias);
			}

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
				email: email,
				alias: user!.alias,
				picture: picture || null,
				message: 'Connexion Google réussie'
			});

		} catch (error) {
			console.error('[AUTH] ❌ Erreur:', error);
			return res.code(500).send({
				error: 'Erreur lors de la vérification',
				success: false,
				details: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	});
}
