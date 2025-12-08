import { FastifyInstance } from "fastify";
import { getDatabase } from "../db/databaseSingleton.js";

const ACCEPT_REQUEST = true;
const REJECT_REQUEST = false;

export async function registerFriendsRoutes(server: FastifyInstance)
{
	const db = getDatabase();

	server.get('/api/friends', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' });

		const friends = db.getFriends(user.id);
		return res.code(200).send({ friends });
	})

	server.get('/api/friends/requests/pending', async (req, res) => {
		const user = (req as any).user

		if (!user || !user.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' })

		try
		{
			const pendingRequests = db.getPendingFriendRequests(user.id).map(request =>
			{
				let avatar = '/avatars/defaults/Transcendaire.png'
				if (request.google_picture)
					avatar = `/avatars/users/${request.google_picture}`
				else if (request.avatar)
					avatar = `/avatars/users/${request.avatar}`
				return { ...request, avatar }
			})
			return res.code(200).send({ pendingRequests })
		}
		catch (error)
		{
			console.error('[FRIENDS] Error in pending requests:', error)
			return res.code(500).send({ message: 'Erreur serveur' })
		}
	})

	server.get('/api/friends/requests/sent', async (req, res) => {
		const user = (req as any).user

		if (!user || !user.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' })

		try
		{
			const sentRequests = db.getSentFriendRequests(user.id).map(request =>
			{
				let avatar = '/avatars/defaults/Transcendaire.png'
				if (request.google_picture)
					avatar = `/avatars/users/${request.google_picture}`
				else if (request.avatar)
					avatar = `/avatars/users/${request.avatar}`
				return { ...request, avatar }
			})
			return res.code(200).send({ sentRequests })
		}
		catch (error)
		{
			console.error('[FRIENDS] Error in sent requests:', error)
			return res.code(500).send({ message: 'Erreur serveur' })
		}
	})

	server.get('/api/friends/status/:alias', async (req, res) => {
		const user = (req as any).user
		if (!user || !user.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' })

		const { alias } = req.params as any
		if (!alias)
			return res.code(400).send({ message: 'Alias requis' })

		const status = db.getFriendshipStatus(user.id, alias)
		return res.code(200).send({ status })
	})

	//*Send request
	server.post('/api/friends/request', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' });

		const { alias } = req.body as any;

		if (!alias)
			return res.code(400).send({ message: 'Alias requis' });

		const requestId = db.sendFriendRequest(user.id, alias);
		return res.code(201).send({
			success: true,
			message: `Demande envoyée à ${alias}`,
			requestId
		});
	})

	//*accept a request
	server.post('/api/friends/accept', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' });

		const { alias } = req.body as any;

		if (!alias)
			return res.code(400).send({ message: 'Alias de l\'expéditeur requis'});

		db.handleFriendRequest(user.id, alias, ACCEPT_REQUEST);
		return res.code(200).send({
			succes: true,
			message: `Vous êtes maintenant ami avec ${alias}`
		});
	})

	//*reject a request
	server.post('/api/friends/reject', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' });

		const { alias } = req.body as any;

		if (!alias)
			return res.code(400).send({ message: 'Alias de l\'expéditeur requis'});

		db.handleFriendRequest(user.id, alias, REJECT_REQUEST);
		return res.code(200).send({
			succes: true,
			message: 'Demande d\'ami refusée'
		});
	})

	//*delete a request
	server.delete('/api/friends/request/:alias', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' });

		const { alias } = req.params as any;

		if (!alias)
			return res.code(400).send({ message: 'Alias de l\'expéditeur requis'});

		db.cancelFriendRequest(user.id, alias);
		return res.code(200).send({
			success: true,
			message: 'Demande d\'ami retirée'
		});
	})

	//*delete a friend
	server.delete('/api/friends/:alias', async (req, res) => {
		const user = (req as any).user;

		if (!user || !user.id)
			return res.code(401).send({ message: 'Veuillez vous reconnecter' });

		const { alias } = req.params as any;

		if (!alias)
			return res.code(400).send({ message: 'Alias de l\'expéditeur requis'});

		db.removeFriend(user.id, alias);
		return res.code(200).send({
			success: true,
			message: `Vous n'êtes plus ami avec ${alias}`
		})
	})

}