import { FastifyInstance } from "fastify";
import { getDatabase } from '../db/databaseSingleton.js';
import { validateNewPassword, validateCurrentPassword, validateNewAlias } from "../validators/user.validator.js";
import { hashPassword } from "../utils/passwords.js";

export async function registerUserRoutes(server: FastifyInstance)
{
	const db = getDatabase();

	server.put('/api/user/password', async (req, res) => {
		const authUser = (req as any).user;

		if (!authUser || !authUser.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' });

		const { currentPassword, newPassword } = req.body as any;

		const user = req.user;

		validateCurrentPassword(currentPassword, user.password);
		validateNewPassword(newPassword);

		if (currentPassword === newPassword)
			return res.code(400).send({ message: 'Le nouveau mot de passe doit être différent de l\'ancien' });

		const hashedPassword = hashPassword(newPassword);
		db.updateUserPassword(user.id, hashedPassword);

		const newSessionId = db.createOrUpdateSession(user.id);

		res.setCookie('session_id', newSessionId, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 //*24 hours
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
    });
}