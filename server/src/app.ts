import fastify from 'fastify'
import { registerPlugins } from './plugins/plugins.js'
import { registerRoutes } from './routes/routes.js'
import { paths } from './config/paths.js'
import { register } from 'module';

export async function createApp() { //*no network binding. Just registering stuff
	const server = fastify({ logger: false });

	console.log('Server paths:')
    console.log('  Current directory:', process.cwd())
    console.log('  __dirname:', paths.__dirname)
    console.log('  Public path:', paths.public)
    console.log('  Dist path:', paths.dist)
    console.log('  Index path:', paths.index)

	try {
		await registerPlugins(server);
		console.log('✅ Plugins registered')
		await registerRoutes(server);
		console.log('✅ Routes registered')
	} catch (error) {
		console.error('[ERROR] ', error);
		throw error;
	}

	return server;
}