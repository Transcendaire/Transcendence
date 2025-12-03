import { FastifyInstance } from 'fastify'
import { getDatabase } from '../db/databaseSingleton.js'
import path from 'path'
import { paths } from '../config/paths.js'
import fs from 'fs/promises'
import { validateAvatar } from '../validators/avatar.validator.js'
import { DEFAULT_AVATAR_FILENAME } from '../utils/consts.js'

export async function registerAvatarRoutes(server: FastifyInstance)
{

	const db = getDatabase();

	server.post('/api/user/avatar', async (req, res) => {

		const user = (req as any).user;

		if (!user)
			return res.code(401).send({ success: false, message: 'Veuillez vous reconnecter' });

		const filename = await validateAvatar(req, user.id);
		

		const oldAvatar = db.getUserAvatar(user.id);
		if (oldAvatar && oldAvatar !== DEFAULT_AVATAR_FILENAME)//! check
		{
			try {
				const oldPath = path.join(paths.usersAvatars, oldAvatar);
				await fs.unlink(oldPath)
			} catch(error) {
				console.log('[AVATAR] Failed to delete old avatar:', error);
			}
		}
		db.updateUserAvatar(user.id, filename);

		// changeAvatar(user.id, filename);

		return res.code(200).send({ success: true, message: 'Avatar mis à jour avec succès', avatar: `/avatars/users/${filename}` })
	})


	server.get('/api/user/avatar', async (req, res) => {

		const user = (req as any).user;

		if (!user)
			return res.code(401).send({ success: false, message: 'Veuillez vous reconnecter' });

		const avatar = db.getUserAvatar(user.id);

		if (!avatar)
			return res.code(404).send({ success: false, message: 'Avatar introuvable'});

		let avatarPath = "";
		if (avatar === DEFAULT_AVATAR_FILENAME)
			avatarPath = `/avatars/defaults/${avatar}`;
		else
			avatarPath = `/avatars/users/${avatar}`;

		return res.code(200).send({ success: true, avatar: avatarPath });
	})

	server.delete('/api/user/avatar', async (req, res) => {

		const user = (req as any).user;

		if (!user)
			return res.code(401).send({ success: false, message: 'Veuillez vous reconnecter' });

		const oldAvatar = db.getUserAvatar(user.id);
		if (oldAvatar && oldAvatar !== DEFAULT_AVATAR_FILENAME)
		{
			const oldPath = path.join(paths.usersAvatars, oldAvatar);
			try {
				await fs.access(oldPath);
				await fs.unlink(oldPath);
			} catch(error) {
				console.log('[AVATAR] Failed to delete old avatar:', error);
			}
		}
		
		db.updateUserAvatar(user.id, DEFAULT_AVATAR_FILENAME);

		return res.code(200).send({ success: true, message: 'Avatar réinitialisé', avatar: `/avatars/defaults/${DEFAULT_AVATAR_FILENAME}`});
	})
}

