import { createApp } from './app.js'
//! CAREFUL see with C and P about the port
(async () => {
	try {
		const server = await createApp();

		await server.listen({ port: 8080, host: '0.0.0.0' })
		console.log('server listening at localhost:8080');
	} catch (error) {
		console.error('Server error: ', error);
		process.exit(1);
	}
})()