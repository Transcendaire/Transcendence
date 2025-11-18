import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import supertest from 'supertest';
import { getDatabase } from '../src/db/databaseSingleton.js';
import { app, tournamentManager } from "../src/index.js"
import { Tournament, TournamentStatus } from '../src/services/tournament.js';
import { setMaxIdleHTTPParsers } from 'http';
import { TournamentManagerService } from '../src/services/tournamentManager.js';

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

		it('should return taken: false for an available name', async () => {

			const availableName = secondaryPlayer;

			const res = await request.get(`/api/players/check-playerNameAvailability?playerName=${availableName}`).expect(200);

			expect(res.body.taken).toBe(false);
		})
    })
	})
})


describe('Tournament API tests', () => {
	let request: any;
	let anotherRequest: any;
	let secondPlayerRequest: any;
	let db: any;
	let tournamentId: any;
	let tournamentName = 'Tournament';
	let secondTournamentName = 'TournamentNumberTwo'

	beforeAll(async () => {
		db = getDatabase();
		db.deleteAll();
		tournamentManager.clearAll();
		request = supertest.agent(app.server);
		anotherRequest = supertest.agent(app.server);
		secondPlayerRequest = supertest.agent(app.server);

		await request.post('/api/players').send({ playerName: 'TournamentCreator'}).expect(201);
	});

    describe('POST /api/tournaments - Creating tournaments', () => {
        

        it('should create a valid tournament', async () => {
            const res = await request.post('/api/tournaments').send({
                name: tournamentName,
                maxPlayers: 4,
                creatorName: 'TournamentCreator'
            }).expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe(tournamentName);
            expect(res.body.maxPlayers).toBe(4);
            expect(res.body.currentPlayers).toBe(1);
            expect(res.body.status).toBe('created');

            tournamentId = res.body.id;
        });
	});

	describe('Conflict between tournaments', () => {

		it('should refuse to create an already existing tournament', async () => {
			const res = await request.post('/api/tournaments').send({
				name: tournamentName, //*already created
				maxPlayers: 4,
				creatorName: 'creator'
		}).expect(409);
		//toDo check if tournament was still created?
		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('Le tournoi Tournament existe déjà et ne peut pas être créé')
		console.log('ERROR : ', res.body.error);
	})

	it('should refuse to create a tournament if the creator is inside another', async () => {
		const res = await request.post('/api/tournaments').send({
			name: 'TournamentNumberTwo',
			maxPlayers: 4,
			creatorName: 'TournamentCreator' //* already inside another tournament
		}).expect(409);

		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('Le joueur est déjà présent dans le tournoi');
		console.log('ERROR : ', res.body.error);
	})
	
})

	describe('Invalid tournament names', () => {

		
		it('should refuse to create a tournament with not a valid name (unauthorized characters)', async () => {
			const res = await request.post('/api/tournaments').send({
				name: 'Tourn@ment',
				maxPlayers: 4,
				creatorName: 'Soso'
		}).expect(400);
		
		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('Au moins un caractère invalide')
		console.log('ERROR : ', res.body.error);
	})

	it('should refuse to create a tournament with not a valid name (no name)', async () => {
		const res = await request.post('/api/tournaments').send({
			name: undefined,
			maxPlayers: 4,
			creatorName: 'Soso'
		}).expect(400);

		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('Le nom de tournoi doit comporter au moins 3 caractères')
		console.log('ERROR : ', res.body.error);
	})

	it('should refuse to create a tournament with not a valid name (empty name)', async () => {
		const res = await request.post('/api/tournaments').send({
			name: '',
			maxPlayers: 4,
			creatorName: 'Soso'
		}).expect(400);

		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('Le nom de tournoi doit comporter au moins 3 caractères')
		console.log('ERROR : ', res.body.error);
	})

	it('should refuse to create a tournament with not a valid name (less than 3 characters)', async () => {
		const res = await request.post('/api/tournaments').send({
			name: 'Tr',
			maxPlayers: 4,
			creatorName: 'Soso'
		}).expect(400);
		
		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('Le nom de tournoi doit comporter au moins 3 caractères')
		console.log('ERROR : ', res.body.error);
	})
})
	

	describe('Invalid maxPlayers values', () => {

		it('should refuse to create a tournament with not a valid number of players (< 2)', async () => {
			const res = await request.post('/api/tournaments').send({
			name: tournamentName,
			maxPlayers: 0,
			creatorName: 'Soso'
		}).expect(400);

		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('Le tournoi doit comporter entre 2 et 64 joueurs')
		console.log('ERROR : ', res.body.error);
	})
	
	it('should refuse to create a tournament with not a valid number of players (> 64)', async () => {
		const res = await request.post('/api/tournaments').send({
			name: tournamentName,
			maxPlayers: 65,
			creatorName: 'Soso'
		}).expect(400);

		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('Le tournoi doit comporter entre 2 et 64 joueurs')
		console.log('ERROR : ', res.body.error);
	})

	it('should refuse to create a tournament with not a valid number of players (odd number)', async () => {
		const res = await request.post('/api/tournaments').send({
			name: tournamentName,
			maxPlayers: 3,
			creatorName: 'Soso'
		}).expect(400);

		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('Le tournoi doit comporter un nombre pair de joueurs')
		console.log('ERROR : ', res.body.error);
	})
})

	describe('POST /api/tournaments/:id/join - Joining tournaments', () => {


	it('should let a player join an already existing tournament', async () => {
		await secondPlayerRequest.post('/api/players').send({ playerName: 'Soner' }).expect(201);

		const res = await secondPlayerRequest.post(`/api/tournaments/${tournamentId}/join`).send({
			playerName: 'Soner'
		}).expect(200);

		expect(res.body.success).toBe(true);
		expect(res.body.tournamentId).toBe(tournamentId);
		expect(res.body.tournamentName).toBe(tournamentName);
		expect(res.body.currentPlayers).toBe(2);
		expect(res.body.maxPlayers).toBe(4);
		expect(res.body.status).toBe('created');

	})

	it('return 200 if player is already inside the tournament', async () => {
		const res = await request.post(`/api/tournaments/${tournamentId}/join`).send({
			playerName: 'Soner'
		}).expect(200);

		expect(res.body.success).toBe(true);
		expect(res.body.tournamentId).toBe(tournamentId);
		expect(res.body.tournamentName).toBe(tournamentName);
		expect(res.body.currentPlayers).toBe(2);
		expect(res.body.maxPlayers).toBe(4);
		expect(res.body.status).toBe('created');

	})

	it('should refuse if player is already inside another tournament', async () => {

		const otherPlayer = supertest.agent(app.server);
		await otherPlayer.post('/api/players').send({ playerName: 'testPlayer'}).expect(201);
	
		const otherRes = await otherPlayer.post('/api/tournaments').send({
			name: secondTournamentName,
			maxPlayers: 4,
			creatorName: 'testPlayer'
		}).expect(201);

		expect(otherRes.body).toHaveProperty('id');
		expect(otherRes.body.id).toBeDefined();
		const newTournamentId = otherRes.body.id;

		const res = await otherPlayer.post(`/api/tournaments/${tournamentId}/join`).send({
			playerName: 'testPlayer'
		}).expect(409);
            
		expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('déjà dans le tournoi');

		tournamentManager.deleteTournament(newTournamentId)
	})

	it('should refuse if the tournament is already full', async () => {

		const player3 = supertest.agent(app.server);
		await player3.post('/api/players').send({ playerName: 'player3'}).expect(201);
		await player3.post(`/api/tournaments/${tournamentId}/join`).send({
			playerName: 'player3'
		}).expect(200)
		
		const player4 = supertest.agent(app.server);
		await player4.post('/api/players').send({ playerName: 'player4'}).expect(201);
		await player4.post(`/api/tournaments/${tournamentId}/join`).send({
			playerName: 'player4'
		}).expect(200)

		const player5 = supertest.agent(app.server);
		await player5.post('/api/players').send({ playerName: 'player5'}).expect(201);
		const res = await player5.post(`/api/tournaments/${tournamentId}/join`).send({
			playerName: 'player5'
		}).expect(409)

		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('complet')

		await player3.post(`/api/tournaments/${tournamentId}/leave`).send({
			playerName: 'player3'
		}).expect(200)

		await player4.post(`/api/tournaments/${tournamentId}/leave`).send({
			playerName: 'player4'
		}).expect(200)

	})

	it('should refuse if tournament has already started', async () => {

		let tournament = tournamentManager.getTournament(tournamentId);
		tournament!.setStatus(TournamentStatus.RUNNING)
		await anotherRequest.post('/api/players').send({ playerName: 'randomPlayer'}).expect(201);
		const res = await anotherRequest.post(`/api/tournaments/${tournamentId}/join`).send({
			playerName: 'randomPlayer'
		}).expect(409);

		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('commencé')

		tournament!.setStatus(TournamentStatus.CREATED)

	})

	it('should refuse if tournament is over', async () => {

		let tournament = tournamentManager.getTournament(tournamentId);
		tournament!.setStatus(TournamentStatus.COMPLETED)
		await anotherRequest.post('/api/players').send({ playerName: 'randomPlayer'}).expect(200);
		const res = await anotherRequest.post(`/api/tournaments/${tournamentId}/join`).send({
			playerName: 'randomPlayer'
		}).expect(409);

		expect(res.body).toHaveProperty('error');
		expect(res.body.error).toContain('terminé')

		tournament!.setStatus(TournamentStatus.CREATED)
	})
})


	describe('GET /api/players/:playerName/tournament', () => {
		
	it('should return canConnect: true for a player not in any tournament', async () => {

		const freePlayer = supertest.agent(app.server);
        await freePlayer.post('/api/players').send({ playerName: 'FreePlayer' }).expect(201);

        const res = await freePlayer.get('/api/players/FreePlayer/tournament').expect(200);

        expect(res.body.canConnect).toBe(true);
        expect(res.body.tournamentId).toBeUndefined();
    });

    it('should return canConnect: true with tournamentId for a player in tournament (matching cookie)', async () => {
        
		const res = await request.get('/api/players/TournamentCreator/tournament').expect(200); //*TournamentCreator agent

        expect(res.body.canConnect).toBe(true);
        expect(res.body.tournamentId).toBe(tournamentId);
    });

    it('should return canConnect: false for player in tournament (different cookie)', async () => {
        const differentAgent = supertest.agent(app.server);
        await differentAgent.post('/api/players').send({ playerName: 'DifferentPlayer' }).expect(201);

        const res = await differentAgent.get('/api/players/TournamentCreator/tournament').expect(200);

        expect(res.body.canConnect).toBe(false);
        expect(res.body.tournamentId).toBe(tournamentId);
    });

    it('should return canConnect: true if player\'s tournament is completed', async () => {
        let tournament = tournamentManager.getTournament(tournamentId);
        tournament!.setStatus(TournamentStatus.COMPLETED);

        const res = await request.get('/api/players/TournamentCreator/tournament').expect(200);

        expect(res.body.canConnect).toBe(true);
        expect(res.body.tournamentId).toBeUndefined();

        tournament!.setStatus(TournamentStatus.CREATED);
    });

    it('should return canConnect: true for player in running tournament (matching cookie, same tournament)', async () => {
        let tournament = tournamentManager.getTournament(tournamentId);
        tournament!.setStatus(TournamentStatus.RUNNING);

        const res = await request.get('/api/players/TournamentCreator/tournament').expect(200);

        expect(res.body.canConnect).toBe(true);
        expect(res.body.tournamentId).toBe(tournamentId);


        tournament!.setStatus(TournamentStatus.CREATED);
    });

    it('should return an error for non-existent player', async () => {
        const res = await request.get('/api/players/NonExistentPlayer/tournament').expect(404);

        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toContain('Le joueur n\'existe pas');
    });

});

	describe('POST /api/tournaments/:id/leave', () => {

		it('should allow a player to leave a tournament (tournament Creator)', async () => {

			const res = await request.post(`/api/tournaments/${tournamentId}/leave`).send({
				playerName: 'TournamentCreator'
			}).expect(200);

			expect(res.body).toHaveProperty('success');
			expect(res.body.success).toBe(true);
			
			const tournament = tournamentManager.getTournament(tournamentId);
			expect(tournament?.getStatus()).toBe(TournamentStatus.CREATED);
			expect(tournament?.getPlayerCount()).toBe(1);
		})

		it('should delete the tournament after the last player leaves it', async () => {
			const res = await secondPlayerRequest.post(`/api/tournaments/${tournamentId}/leave`).send({
				playerName: 'Soner'
			}).expect(200);

			expect(res.body).toHaveProperty('success');
			expect(res.body.success).toBe(true);
			
			const tournament = tournamentManager.getTournament(tournamentId);
			expect(tournament).toBe(undefined);
			expect(tournamentManager.getNumberOfTournaments()).toBe(0);
			const arr = tournamentManager.listTournaments();
		})
	})
})
