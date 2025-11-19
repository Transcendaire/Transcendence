import fastify from 'fastify'
import websocket from '@fastify/websocket'
import fastifyCookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import { MatchmakingService } from './services/matchmaking.js'
import fs from 'fs'
import { TournamentManagerService } from './services/tournamentManager.js'
import { Tournament, TournamentStatus } from './services/tournament.js'
import { inputParserClass } from '../../shared/inputParser.js'
import { getDatabase } from './db/databaseSingleton.js'
import { DatabaseError, errTournament, TournamentError, UserError } from '../../shared/errors.js'
import { Player } from './types.js'
declare module 'fastify' {
  interface FastifyRequest {
	player?: Player;
  }
}

const server = fastify({
	logger: false // Enable logging
})

export const app = server;
export let tournamentManager: TournamentManagerService; //!for testing
(async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const server = fastify({
    logger: true // Enable logging
  })
  const matchmaking = new MatchmakingService()
  const publicPath = path.join(__dirname, '../../../../client/public')
  const distPath = path.join(__dirname, '../../../../client/dist')
  const indexPath = path.join(publicPath, 'index.html')
  // Debug the correct paths
  console.log('Current directory:', process.cwd())
  console.log('__dirname:', __dirname)
  console.log('Public path:', publicPath)
  console.log('Index path:', indexPath)
  

  tournamentManager.loadTournamentsFromDatabase();
  // Register WebSocket plugin
  await server.register(websocket)
  
  // Plugin pour que le serveur puisse serve des fichiers statics
  await server.register(fastifyStatic, {
    root: publicPath,
    prefix: '/',
    index: false
  })
  
  await server.register(fastifyStatic, {
    root: distPath,
    prefix: '/dist/',
    index: false,
    decorateReply: false
  })
  

  // WebSocket endpoint for the game
  server.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (connection, req) => {
      const ws = connection.socket
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString())
          matchmaking.handleMessage(ws, data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      })
      ws.on('close', () => {
        matchmaking.removePlayer(ws)
      })
    })
  })


  /*******************************
   * PLAYER API ROUTES
   *******************************/

server.get('/api/debug/players', async (req, res) => {
    const players = db.getAllPlayers();
    return res.send({
        total: players.length,
        players: players.map(p => ({ id: p.id, alias: p.alias }))
    });
});

server.get<{ Querystring: { playerName: string } }>
('/api/players/check-playerNameAvailability',
	async (req, res) => {
		const { playerName } = req.query;
		const id = req.cookies.player_id;
		
		if (id)
		{
			const player = db.getPlayerBy('id', id);
			if (player && playerName  === player.alias)
				return res.code(200).send({ taken: false });
		}

		if (db.playerExists(playerName))
			return res.code(409).send({ taken: true, error: 'Le nom du joueur est déjà pris' });

		return res.code(200).send({ taken: false });
	})

  /*******************************
   * TOURNAMENT API ROUTES
   *******************************/

  server.get<{ Querystring: { playerName?: string } }>
  ('/api/tournaments', 
    async (req, res) => {
    try {
      const { playerName } = req.query;
      const tournaments = tournamentManager.listTournaments();
      const updatedTournaments = tournaments.map(t => {

        const currTournament = tournamentManager.getTournament(t.id);
        const isMember = playerName && currTournament!.hasPlayer(playerName)
        return {...t, isMember};
      })
      return res.send({ tournaments: updatedTournaments });
    } catch (error) {
		const message = String(error);
		return res.code(500).send({ error: message})
    }
  })


  server.get('/api/players/me', async (req, res) => {

	const cookieId = req.cookies.player_id;
	let player = undefined;

	if (!cookieId)
		return res.code(401).send({ error: 'Joueur/Joueuse non authentifié(e)' });

	try {
			player = db.getPlayerBy('id', cookieId);
			if (player)
				return res.code(200).send({ playerName: player.alias, playerId: player.id });
			else
				return res.code(404).send( { error: 'Joueur/Joueuse inexistant(e)'});
	} catch (error) {
		const message = String(error);
		console.error(message);
	}

  })

  server.get<{Params: { playerName: string} }> //*to know if they can reconnect to their current tournament
  ('/api/players/:playerName/tournament',
	async (req, res) => {

		try {

			const playerName = req.params.playerName.trim();
			if (db.getPlayer(playerName) === undefined)
				return res.code(404).send({ error: 'Le joueur n\'existe pas' });
			inputParser.parsePlayerName(playerName);

			const tournamentOfPlayer = tournamentManager.findTournamentOfPlayer(playerName);
			if (!tournamentOfPlayer || tournamentOfPlayer.getStatus() === TournamentStatus.COMPLETED)
				return res.code(200).send({ canConnect: true, tournamentId: undefined }); //*free to join any tournament, since player's tournament is over or not in any tournament

			const cookiePlayerId = req.cookies.player_id; 
			if (cookiePlayerId) //*
				{
					const player = db.getPlayerBy('id', cookiePlayerId);
					if (player && player.alias === playerName)
						return res.code(200).send({ canConnect: true, tournamentId: tournamentOfPlayer!.id })
				}
				
			return res.code(200).send({ canConnect: false, tournamentId: tournamentOfPlayer!.id });
		} catch (error) {
			const message = String(error);
			console.error(message);
			return res.code(500).send({ canConnect: false, tournamentId: undefined });
		}
	}
  )


  server.post<{ Body: { playerName: string } }>
  ('/api/players', async (req, res) => {
	const { playerName } = req.body;

	
	try {
		inputParser.parsePlayerName(playerName);

		const existingPlayerByName = db.getPlayer(playerName);
		const cookieId = req.cookies.player_id;
		const existingPlayerByCookie = cookieId ? db.getPlayerBy('id', cookieId): undefined;

		if (existingPlayerByCookie && existingPlayerByCookie.alias === playerName) //*cookie exists and player corresponds to the request name
			return res.code(200).send({ playerId: existingPlayerByCookie.id, playerAlias: existingPlayerByCookie.alias})
		
		if (existingPlayerByCookie && existingPlayerByCookie.alias !== playerName) //* cookie exists and player doesnt correspond
		{
			db.updatePlayerAlias(existingPlayerByCookie.id, playerName);
			return res.code(200).send({ playerId: existingPlayerByCookie.id, newPlayerAlias: playerName })
		}

		if (existingPlayerByName)
			return res.code(409).send({ error: 'Le nom du joueur est déjà pris'});
		
		const newPlayerId = db.createPlayer(playerName);
		res.setCookie('player_id', newPlayerId, {
			path: '/',
			httpOnly: true,
			maxAge: 24 * 60 * 60
		});
		return res.code(201).send({ newPlayerId, playerName });
	} catch (error) {
		const message = String(error);
		if (error instanceof UserError)
			return res.code(400).send({ error: message });
		return res.code(500).send({ error: message });
	}
  })

  server.post<{ Body: { name: string; maxPlayers: number; creatorName: string } }>
  ('/api/tournaments', 
    async (req, res) => {
	const { name, maxPlayers, creatorName } = req.body;
	try {
		inputParser.parsePlayerName(creatorName);
		parseTournamentAtCreation(name, maxPlayers);
	
		const otherTournament = tournamentManager.findTournamentOfPlayer(creatorName);
		if (otherTournament)
			return res.code(409).send({ error: `Impossible de créer le tournoi. Le joueur est déjà présent dans le tournoi ${otherTournament.name}`})
        
		const tournamentId = tournamentManager.createTournament(name, maxPlayers);
        const tournament = tournamentManager.getTournament(tournamentId);
        if (!tournament)
			return res.code(500).send({ error: 'Erreur lors de la création du tournoi'});

        tournament.addPlayerToTournament(creatorName, undefined);
        return res.code(201).send({
            success: true,
            id: tournamentId,
            name: name,
            maxPlayers: maxPlayers,
            currentPlayers: tournament.getPlayerCount(),
            status: 'created',
            message: 'Tournoi créé et vous l\'avez rejoint automatiquement'
        });

        } catch (error) {
			const message = String(error);
			if (error instanceof TournamentError)
			{
				if (error.code === errTournament.ALREADY_EXISTING)
					return res.code(409).send({ error: message });
				else
					return res.code(400).send({ error: message });
			}
            return res.code(500).send({ error: message });
        }
  })

  server.post<{ Params: {id: string}, Body: {playerName: string}}>
  ('/api/tournaments/:id/join', async(req, res) => {
    
    const tournamentId = req.params.id;
    const { playerName } = req.body;
    const tournament = tournamentManager.getTournament(tournamentId);

	
	const existingTournament = tournamentManager.findTournamentOfPlayer(playerName)
	if (existingTournament && tournamentId !== existingTournament.id)
		return res.code(409).send({ error: `Vous êtes déjà dans le tournoi ${existingTournament.name}`})
	else if (existingTournament && tournamentId === existingTournament.id)
		    return res.code(200).send({
		success: true,
		tournamentId: tournamentId,
		tournamentName: existingTournament.name,
		currentPlayers: existingTournament.getPlayerCount(),
		maxPlayers: existingTournament.maxPlayers,
		status: existingTournament.getStatus()
    })
	try {
		inputParser.parseTournamentAtJoin(tournament); //ToDo player name is parsed inside the function. Modify inputParser to do it and send the responses
		inputParser.parsePlayerName(playerName);
    	tournament!.addPlayerToTournament(playerName, undefined);

    	const updatedTournament = tournamentManager.getTournament(tournamentId);

    	return res.code(200).send({
    	success: true,
    	tournamentId: tournamentId,
    	tournamentName: updatedTournament?.name,
    	currentPlayers: updatedTournament?.getPlayerCount(),
    	maxPlayers: updatedTournament?.maxPlayers,
    	status: updatedTournament?.getStatus()
    	})

    } catch (error) {
    	console.error(`Error adding player to tournament ${tournament!.name}`,error);
		const message = String(error);
		if (error instanceof TournamentError)
		{
			switch (error.code) {
				case errTournament.TOURNAMENT_FULL:
				case errTournament.ALREADY_STARTED:
				case errTournament.ALREADY_OVER:
					return res.code(409).send({error: message});
				case errTournament.NOT_EXISTING:
					return res.code(404).send({error: message});
			}
		}
    	return res.code(500).send({error: message })
    }

  })

  server.post<{ Params: {id: string}, Body: {playerName: string}}>
  ('/api/tournaments/:id/leave', 
    async(req, res) => {
      const tournamentId = req.params.id;
      const { playerName } = req.body;
      const tournament = tournamentManager.getTournament(tournamentId);

      try {
          tournament!.removePlayerFromTournament(playerName);
		  if (tournament!.getPlayerCount() === 0)
			tournamentManager.deleteTournament(tournament!.id);
          return res.code(200).send({ success: true });
      } catch (error) {
          console.error(`Error removing player from tournament ${tournament!.name}`, error);
		  const message = String(error);
          return res.code(500).send({ error: message });
      }
  });


  /*******************************
   * STATIC FILE ROUTES
   *******************************/
  
  // Serve index.html for the root path
  server.get('/', async (request, res) => {
    console.log('Serving root path')
    try {
      const content = await fs.promises.readFile(indexPath, 'utf8')
      return res.type('text/html').send(content)
    } catch (err) {
      console.error(`Error reading index.html: ${err}`)
	  const message = String(err);
      return res.code(500).send(message)
    }
  })

  server.setNotFoundHandler((request, res) => {
    console.log(`NotFound handler for: ${request.url}`)
    
    // Skip API routes
    if (request.url.startsWith('/api/')) {
      return res.code(404).send({ error: 'API endpoint not found' })
    }
    
    // Skip WebSocket route
    if (request.url === '/game') {
      return res.code(404).send({ error: 'WebSocket endpoint not found' })
    }

    // Skip les fichiers statiques (JS, CSS, images, etc.)
    if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|json|woff|woff2|ttf)$/)) {
      return reply.code(404).send('File not found')
    }
    
    // For all other routes, serve the index.html file
    return fs.promises.readFile(indexPath, 'utf8')
      .then(content => {
        return res.type('text/html').send(content)
      })
      .catch(err => {
        console.error(`Error reading index.html: ${err}`)
        return res.code(500).send('Internal Server Error')
      })
  })
  

  /*******************************
   * START SERVER
   *******************************/
  
  try {
    await server.listen({ port: 8080, host: '0.0.0.0' })
    console.log('Server listening on port 8080')
  } catch (err) {
    console.error('Server error:', err)
    process.exit(1)
  }
})()



/*******************************> > > > UTILS < < < <******************************/

function parseTournamentAtCreation(tournamentName: string, maxPlayers: number)
{
	if (!tournamentName || tournamentName.length < 3)
		throw new TournamentError("Le nom de tournoi doit comporter au moins 3 caractères");
	else if (!/^[a-zA-Z0-9_-]+$/.test(tournamentName))
		throw new TournamentError("Au moins un caractère invalide dans le nom de tournoi");
	if (maxPlayers === undefined || typeof maxPlayers !== 'number')
		throw new TournamentError('Le nombre de joueurs est requis');
	if (maxPlayers < 2 || maxPlayers > 64)
		throw new TournamentError('Le tournoi doit comporter entre 2 et 64 joueurs');
	if (maxPlayers % 2)
		throw new TournamentError('Le tournoi doit comporter un nombre pair de joueurs');
}