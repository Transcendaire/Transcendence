import { createApp } from './app.js'
(async () => {
	try {
		const server = await createApp();

		await server.listen({ port: 8080, host: '0.0.0.0' })
	} catch (error) {
		console.error('Server error: ', error);
		process.exit(1);
	}
})()