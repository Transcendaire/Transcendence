import path from 'path'
import { fileURLToPath } from 'url'

const pathToClient = '../../../client'
const pathToUploads = '../../uploads'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const paths = {
	__dirname, 
	public: path.join(__dirname, `${pathToClient}/public`),
	dist: path.join(__dirname, `${pathToClient}/dist`),
	index: path.join(__dirname, `${pathToClient}/public/index.html`),
	uploads: path.join(__dirname, `${pathToUploads}`),
    avatars: path.join(__dirname, `${pathToUploads}/avatars`),
    defaultAvatars: path.join(__dirname, `${pathToUploads}/avatars/defaults`),
    userAvatars: path.join(__dirname, `${pathToUploads}/avatars/users`)
}