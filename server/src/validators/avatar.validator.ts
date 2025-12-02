import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { FastifyRequest } from 'fastify'
import { BadRequest } from '@app/shared/errors'

export async function validateAvatar(req: FastifyRequest)
{
	const data = await req.file();

	if (!data)
		throw new BadRequest('Aucun fichier fourni', 404);

	const allowedTypes = ['image/jpeg', 'image/png'];
	if (!allowedTypes.includes(data.mimetype))
		throw new BadRequest('Format invalide. Les formats autorisés sont JPEG et PNG', 400);

	const buffer = await data.toBuffer();

	
}