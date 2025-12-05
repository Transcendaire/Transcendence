import { FastifyInstance } from "fastify";
import { getDatabase } from '../db/databaseSingleton.js';
import { validateNewPassword, validateCurrentPassword, validateNewAlias } from "../validators/user.validator.js";
import { hashPassword } from "../utils/passwords.js";
import { DEFAULT_AVATAR_FILENAME } from "../utils/consts.js";

export async function registerUserRoutes(server: FastifyInstance)
{
	const db = getDatabase();

	server.put('/api/user/password', async (req, res) => {
		const authUser = (req as any).user;

		if (!authUser || !authUser.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' });

		const { currentPassword, newPassword } = req.body as any;

		validateCurrentPassword(currentPassword, authUser.password);
		validateNewPassword(newPassword);

		if (currentPassword === newPassword)
			return res.code(400).send({ message: 'Le nouveau mot de passe doit être différent de l\'ancien' });

		const hashedPassword = hashPassword(newPassword);
		db.updateUserPassword(authUser.id, hashedPassword);

		const newSessionId = db.createOrUpdateSession(authUser.id);

		res.setCookie('session_id', newSessionId, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'none',
		maxAge: 60 * 60 * 24
		});

		return res.code(200).send({ success: true, message: 'Mot de passe mis à jour avec succès'});
	})

	server.put('/api/user/alias', async (req, res) => {
		const user = (req as any).user;
		
		if (!user || !user.id)
		return res.code(401).send({ message: 'Veuillez vous reconnecter' });

		const { newAlias } = req.body as any;
		validateNewAlias(newAlias, user.id, user.login);

		if (user.alias === newAlias)
		return res.code(409).send({ message: 'Le nouvel alias doit être différent de l\'ancien' })

		db.updateUserAlias(user.id, newAlias.trim());
		return res.code(200).send({ 
		success: true, 
		message: 'Alias mis à jour avec succès',
		alias: newAlias.trim()
		});
	})

	server.get('/api/user/profile/:alias', async (req, res) => {
		const { alias } = req.params as { alias: string };

		if (!alias)
			return res.code(400).send({ message: 'Alias requis' });
	
		const user = db.getUserByAlias(alias);
		if (!user)
			return res.code(404).send({ message: 'Utilisateur non trouvé' });
	
		const stats = db.getPlayerStats(alias);
		const matchHistory = db.getPlayerMatchHistory(alias, 20);
		const tournamentResults = db.getPlayerTournamentResults(alias, 10);

		const tournamentResultsWithMatches = tournamentResults.map((result: any) => {
			const allMatches = db.getMatches(result.tournament_id);
			const completedMatches = allMatches?.filter((m: any) => m.state === 'completed') || [];
			return {
				...result,
				matches: completedMatches
			};
		});
		
		
		let avatarPath = `/avatars/defaults/${DEFAULT_AVATAR_FILENAME}`;
		if (user.avatar && user.avatar !== DEFAULT_AVATAR_FILENAME)
			avatarPath = `/avatars/users/${user.avatar}`;
		else 
		{
			const googlePicture = db.getUserGooglePicture(user.id);
			if (googlePicture)
				avatarPath = googlePicture;
		}
		return res.code(200).send({
			alias: user.alias,
			createdAt: user.created_at,
			avatar: avatarPath,
			stats,
			matchHistory,
			tournamentResults: tournamentResultsWithMatches
		});
	})
}
