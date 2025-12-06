import fs from 'fs/promises';
import path from 'path';
import { paths } from '../config/paths.js';
import crypto, { randomUUID } from 'crypto';
import { getDatabase } from '../db/databaseSingleton.js';

export async function downloadGooglePicture(pictureUrl: string, userId: string): Promise<string | null>
{
	try {
		console.log('[GOOGLE-PIC] Downloading:', pictureUrl);

		const response = await fetch(pictureUrl);
		if (!response.ok)
		{
			console.error('[GOOGLE-PIC] Failted to fetch: ', response.status);
			return null;
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const filename = `google_${userId}-${randomUUID()}.png`;
		const filepath = path.join(paths.usersAvatars, filename);

		await fs.writeFile(filepath, buffer);
		console.log('[GOOGLE-PIC] Saved: ', filename);

		return filename;
	} catch (error)
	{
		console.error('[GOOGLE-PIC] Error downloading the image: ', error);
		return null;
	}
}

export async function deleteGooglePictureFromFileSystem(filename: string): Promise<void>
{
	try {
		if (!filename.startsWith('google_'))
			return ;

		const filepath = path.join(paths.usersAvatars, filename);
		await fs.access(filepath);
		await fs.unlink(filepath);
		console.log('[GOOGLE-PIC] Deleted: ', filename);

	} catch (error) {
		console.error('[GOOGLE-PIC] Error deleting the picture: ', error);
	}
}
