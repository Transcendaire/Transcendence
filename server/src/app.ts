import fastify from 'fastify'
import { registerPlugins } from './plugins/plugins.js'
import { registerRoutes } from './routes/routes.js'
import { paths } from './config/paths.js'
import { register } from 'module';

export async function createApp() { //*no network binding. Just registering stuff
	const server = fastify({ logger: true });

	console.log('Server paths:')
    console.log('  Current directory:', process.cwd())
    console.log('  __dirname:', paths.__dirname)
    console.log('  Public path:', paths.public)
    console.log('  Dist path:', paths.dist)
    console.log('  Index path:', paths.index)

	await registerPlugins(server);
	await registerRoutes(server);
	
	return server;
}