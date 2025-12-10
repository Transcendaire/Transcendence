import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isProduction = process.env.NODE_ENV === 'production' || __dirname.includes('/dist/')

const basePath = isProduction ? '/app' : path.resolve(__dirname, '../..')
const clientPath = isProduction ? '/usr/share/nginx/html' : path.resolve(__dirname, '../../../client')

export const paths = {
	__dirname, 
	public: path.join(clientPath, 'public'),
	dist: path.join(clientPath, 'dist'),
	index: path.join(clientPath, 'public/index.html'),
	uploads: path.join(basePath, 'uploads'),
	avatars: path.join(basePath, 'uploads/avatars'),
	defaultAvatars: path.join(basePath, 'uploads/avatars/defaults'),
	usersAvatars: path.join(basePath, 'uploads/avatars/users')
}
