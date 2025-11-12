import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { getDatabase } from '../src/db/databaseSingleton.js';
import { app } from "../src/index.js"

describe('Player API tests', () => {
	let request: any;
	let db: any;

	beforeEach(() => {
		db = getDatabase();
		db.deleteAll();
		request = supertest(app.server)
	});

	describe('Creating a user by specifying its alias (first creation, available alias)', () => {

		it('should create the user inside the database', async () =>  {
			const res = await request.post('/api/players').send({ playerName: 'Soso'}).expect(201)

			expect(res.body).toHaveProperty('newPlayerId');
			expect(res.body.playerName).toBe('Soso');

			const player = db.getPlayer('Soso')
			expect(player).toBeDefined();
			expect(player.alias).toBe('Soso');
		});
	
		it('should refuse the creation of the user', async () => {
			const res = await request.post('/api/players').send({ playerName: 'S!oso'}).expect(400)

			expect(res.body).toHaveProperty('error');
			console.log("ERROR: ", res.body.error);
		});
		})

})