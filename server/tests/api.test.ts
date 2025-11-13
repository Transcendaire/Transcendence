import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import supertest from 'supertest';
import { getDatabase } from '../src/db/databaseSingleton.js';
import { app } from "../src/index.js"

describe('Player API tests', () => {
	let request: any;
	let db: any;

	beforeAll(() => {
		db = getDatabase();
		db.deleteAll();
		request = supertest.agent(app.server)
	});

	//* MAIN PLAYERS FOR THE TESTS
	let mainPlayer = 'Fire';
	let secondaryPlayer = 'Water';

	describe('Creating a user by specifying its alias (AVAILABLE ALIAS)', () => {

		it('should create the user inside the database', async () =>  {
			const res = await request.post('/api/players').send({ playerName: mainPlayer}).expect(201)

			expect(res.body).toHaveProperty('newPlayerId');
			expect(res.body.playerName).toBe(mainPlayer);

			const player = db.getPlayer(mainPlayer)
			expect(player).toBeDefined();
			expect(player.alias).toBe(mainPlayer);
		});
	
		it('should refuse the creation of the user (INVALID CHARACTER)', async () => {
			const res = await request.post('/api/players').send({ playerName: 'F!re'}).expect(400)

			expect(res.body).toHaveProperty('error');
			console.log("ERROR: ", res.body.error);
		});

		it('should refuse the creation of the user (LENGTH < 3)', async () => {
			const res = await request.post('/api/players').send({ playerName: 'F'}).expect(400)

			expect(res.body).toHaveProperty('error');
			console.log("ERROR: ", res.body.error);
		});

		it('should refuse the creation of the user (NO INPUT)', async () => {
			const res = await request.post('/api/players').send({ playerName: undefined}).expect(400)

			expect(res.body).toHaveProperty('error');
			console.log("ERROR: ", res.body.error);
		});
		})

	describe('Creating a user with an alias already taken', () => {

		it('should serve the existing user (same cookie ID)', async () => {
			const res = await request.post('/api/players').send({ playerName: mainPlayer}).expect(200);

			expect(res.body).toHaveProperty('playerId');
			expect(res.body).toHaveProperty('playerAlias');
			expect(res.body.playerAlias).toBe(mainPlayer);

			const player = db.getPlayer(mainPlayer)
			expect(player).toBeDefined();
			expect(player.alias).toBe(mainPlayer);
		})
	
		it('should update the alias (SAME COOKIE ID)', async () => {

			const oldPlayer = db.getPlayer(mainPlayer)
			expect(oldPlayer).toBeDefined();
			expect(oldPlayer.alias).toBe(mainPlayer);

			const res = await request.post('/api/players').send({ playerName: 'NewPlayer'}).expect(200);

			expect(res.body).toHaveProperty('playerId');
			expect(res.body).toHaveProperty('newPlayerAlias');
			expect(res.body.newPlayerAlias).toBe('NewPlayer');

			const newPlayer = db.getPlayer('NewPlayer')
			expect(newPlayer).toBeDefined();
			expect(newPlayer.id).toBe(oldPlayer.id);

			const resetNameResponse = await request.post('/api/players').send({ playerName: 'Fire'}).expect(200); //*reseting the player to the name Fire
			expect(oldPlayer.alias).toBe(resetNameResponse.body.newPlayerAlias);
			expect(oldPlayer.id).toBe(resetNameResponse.body.playerId);

		})

		it('should refuse the creation of the user (SAME ALIAS WRONG COOKIE)', async () => {

			const newRequest = supertest.agent(app.server); //* allows to reset cookies

			const res = await newRequest.post('/api/players').send({ playerName: mainPlayer}).expect(409)

			expect(res.body).toHaveProperty('error');
			console.log("ERROR: ", res.body.error);
		});

    describe('GET /api/players/me', () => {
        it('should return the current player', async () => {
            const res = await request.get('/api/players/me').expect(200);

            expect(res.body).toHaveProperty('playerName');
            expect(res.body).toHaveProperty('playerId');
            expect(res.body.playerName).toBe(mainPlayer);
        });

        it('should return 401 without cookie', async () => {
            const newRequest = supertest.agent(app.server);
            const res = await newRequest.get('/api/players/me').expect(401);

            expect(res.body).toHaveProperty('error');
        });
    });

    describe('GET /api/players/check-playerNameAvailability', () => {
        it('should return taken: false for own name', async () => {
			const ownName = mainPlayer;
            const res = await request.get(`/api/players/check-playerNameAvailability?playerName=${ownName}`).expect(200);

            expect(res.body.taken).toBe(false);
        });

        it('should return taken: true for own name (NO COOKIE)', async () => {

			const ownName = mainPlayer;
            const anotherRequest = supertest.agent(app.server);

            const res = await anotherRequest.get(`/api/players/check-playerNameAvailability?playerName=${ownName}`).expect(409);

            expect(res.body.taken).toBe(true);
        });

		it('should return take: false for an available name', async () => {

			const availableName = secondaryPlayer;

			const res = await request.get(`/api/players/check-playerNameAvailability?playerName=${availableName}`).expect(200);

			expect(res.body.taken).toBe(false);
		})
    })
	})
})