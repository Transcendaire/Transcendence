import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { paths } from '../config/paths.js'
import { randomUUID } from 'crypto'
import { FastifyRequest } from 'fastify'
import { BadRequest } from '@app/shared/errors.js'

export async function validateAvatar(req: FastifyRequest, userId: string): Promise<string>
{
	const data = await req.file();

	if (!data)
		throw new BadRequest('Aucun fichier fourni', 404);

	const allowedTypes = ['image/jpeg', 'image/png'];
	if (!allowedTypes.includes(data.mimetype))
		throw new BadRequest('Format invalide. Les formats autorisés sont JPEG et PNG', 400);

	const buffer = await data.toBuffer();

	const MAX_SIZE = 5 * 1024 * 1024;
	if (buffer.length > MAX_SIZE)
		throw new BadRequest('Fichier trop volumineux. Le maximum autorisé est 5MB', 413);

	const fileExtension = path.extname(data.filename) || '.png'; //*defaults to png if no extension
	const filename = `${userId}-${randomUUID()}.png`;
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
