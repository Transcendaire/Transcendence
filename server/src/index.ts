import fastify from 'fastify'
import websocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import { MatchmakingService } from './services/matchmaking.js'
import fs from 'fs'
import { TournamentManagerService } from './services/tournamentManager.js'
import { Tournament } from './services/tournament.js'
import { inputParserClass } from '../../client/src/inputParser.js'


(async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const server = fastify({
    logger: true // Enable logging
  })
  const matchmaking = new MatchmakingService()
  const tournamentManager = new TournamentManagerService(matchmaking);
  const inputParser = new inputParserClass();

  const serverCwd = process.cwd();
  const publicPath = path.join(serverCwd, '../client/public')
  const distPath = path.join(serverCwd, '../client/dist')
  const indexPath = path.join(publicPath, 'index.html')
  // Debug the correct paths
  console.log('Current directory:', process.cwd())
  console.log('__dirname:', __dirname)
  console.log('Public path:', publicPath)
  console.log('Index path:', indexPath)
  
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
    prefix: '/dist',
    decorateReply: false
  })
  

  // WebSocket endpoint for the game
  server.register(async function (fastify) {
    fastify.get('/game', { websocket: true }, (connection, req) => {
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
  
  // Serve index.html for the root path
  server.get('/', async (request, reply) => {
    console.log('Serving root path')
    try {
      const content = await fs.promises.readFile(indexPath, 'utf8')
      return reply.type('text/html').send(content)
    } catch (err) {
      console.error(`Error reading index.html: ${err}`)
      return reply.code(500).send('Internal Server Error')
    }
  })
  
	server.post<{ Body: { name: string; maxPlayers: number; creatorName: string } }>
	('/api/tournaments', 
		async (req, reply) => {
		try {
			const { name, maxPlayers, creatorName } = req.body;
		
	        if (!creatorName)
	            return reply.code(400).send({ error: 'Nom du créateur requis' });
	        if (creatorName.trim().length < 3)
	            return reply.code(400).send({ error: 'Le nom doit faire au moins 3 caractères' });
	        if (!/^[a-zA-Z0-9_-]+$/.test(creatorName))
	            return reply.code(400).send({ error: 'Caractères invalides dans le nom' });
		
	        const tournamentId = tournamentManager.createTournament(name, maxPlayers);
	
	        const tournament = tournamentManager.getTournament(tournamentId);
	        if (!tournament)
	            return reply.code(500).send({ error: 'Erreur lors de la création du tournoi'});
	
	        try {
	            tournament.addPlayerToTournament(creatorName, undefined);
			
	            return reply.code(201).send({
	                success: true,
	                id: tournamentId,
	                name: name,
	                maxPlayers: maxPlayers,
	                currentPlayers: tournament.getPlayerCount(),  // ✅ Use actual count
	                status: 'created',
	                message: 'Tournoi créé et vous avez rejoint automatiquement'
	            });
			
	        } catch (error) {
	            console.error('❌ Error auto-joining creator:', error);
	            return reply.code(500).send({ error: 'Tournoi créé mais impossible de vous ajouter' });
	        }
	    } catch (error) {
	        console.error('❌ Error creating tournament:', error);
	        return reply.code(500).send({ error: 'Impossible de créer le tournoi' })
	    }
	})


	server.post<{ Params: {id: string}, Body: {playerName: string}}>
	('/api/tournaments/:id/leave', async(req, res) => {
	    const tournamentId = req.params.id;
	    const { playerName } = req.body;
	    const tournament = tournamentManager.getTournament(tournamentId);

	    if (!tournament)
	        return res.code(404).send({ error: 'Tournoi introuvable' });
	    if (!playerName || playerName.trim().length < 3)
	        return res.code(400).send({ error: 'Nom du joueur requis' });

	    try {
	        tournament.removePlayerFromTournament(playerName);
	        return res.code(200).send({ success: true });
	    } catch (error) {
	        console.error(`Error removing player from tournament ${tournament.name}`, error);
	        return res.code(500).send({ error: 'Impossible de quitter le tournoi' });
	    }
	});

  server.get<{ Querystring: { playerName?: string } }>
  ('/api/tournaments', 
	async (req, reply) => {
	try {
		const { playerName } = req.query;
		const tournaments = tournamentManager.listTournaments();
		const updatedTournaments = tournaments.map(t => {

			const currTournament = tournamentManager.getTournament(t.id);
			const isMember = playerName && currTournament!.hasPlayer(playerName)
			return {...t, isMember};
		})
		return reply.send({ tournaments: updatedTournaments });
	} catch (error) {
		return reply.code(500).send({ error: "Impossible de lister les tournois" })
	}
  })


  server.post<{ Params: {id: string}, Body: {playerName: string}}>
	('/api/tournaments/:id/join', async(req, res) => {
		
		const tournamentId = req.params.id;
		const { playerName } = req.body;
		const tournament = tournamentManager.getTournament(tournamentId);

		inputParser.parseTournamentWithHTTPResponse(tournament, res); //ToDo player name is parsed inside the function. Modify inputParser to do it and send the responses
		
		if (!playerName || playerName === undefined)
			return res.code(400).send({ error: 'Nom du joueur requis' });
		if (playerName.trim().length < 3)
			return res.code(400).send({ error: 'Le nom doit faire au moins 3 caractères' });
		if (!/^[a-zA-Z0-9_-]+$/.test(playerName))
			return res.code(400).send({ error: 'Au moins un caractère interdit dans le nom du joueur'});
	
		try {
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
		return res.code(500).send({error: 'Impossible de rejoindre le tournoi'})
		}

	})

  server.setNotFoundHandler((request, reply) => {
    console.log(`NotFound handler for: ${request.url}`)
    
    // Skip API routes
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'API endpoint not found' })
    }
    
    // Skip WebSocket route
    if (request.url === '/game') {
      return reply.code(404).send({ error: 'WebSocket endpoint not found' })
    }
    
    // For all other routes, serve the index.html file
    return fs.promises.readFile(indexPath, 'utf8')
      .then(content => {
        return reply.type('text/html').send(content)
      })
      .catch(err => {
        console.error(`Error reading index.html: ${err}`)
        return reply.code(500).send('Internal Server Error')
      })
  })
  
  // Start the server
  try {
    await server.listen({ port: 8080, host: '0.0.0.0' })
    console.log('Server listening on port 8080')
  } catch (err) {
    console.error('Server error:', err)
    process.exit(1)
  }
})()