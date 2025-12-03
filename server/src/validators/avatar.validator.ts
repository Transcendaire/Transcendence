import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { paths } from '../config/paths.js'
import { randomUUID } from 'crypto'
import { FastifyRequest } from 'fastify'
import { BadRequest } from '@app/shared/errors.js'
import { getDatabase } from '../db/databaseSingleton.js'
const db = getDatabase();

export async function validateAvatar(req: FastifyRequest, userId: string): Promise<string>
{
	const data = await req.file();

	if (!data)
		throw new BadRequest('Aucun fichier fourni', 404);

	const allowedTypes = ['image/jpeg', 'image/png'];
	if (!allowedTypes.includes(data.mimetype))
		throw new BadRequest('Format invalide. Les formats autorisés sont JPEG et PNG', 400);

	const buffer = await data.toBuffer();

	const fileExtension = path.extname(data.filename) || '.png'; //*defaults to png if no extension
	const filename = `${userId}-${randomUUID()}${fileExtension}`;
	const filepath = path.join(paths.usersAvatars, filename);

	await sharp(buffer)
	.resize(200, 200, {
		fit: 'cover',
		position: 'center'
	})
	.png({ quality: 90 })
	.toFile(filepath);

	return filename;
}

// export async function changeAvatar(userId: string, filename: string)
// {
// 	const oldAvatar = db.getUserAvatar(userId);
// 	if (oldAvatar && oldAvatar !== DEFAULT_AVATAR_FILENAME)//! check
// 	{
// 		try {
			
// 			await fs.unlink(oldAvatar)
// 		} catch(error) {
// 			{}
// 		}
// 	}

// 	db.updateUserAvatar(userId, filename);
// }

