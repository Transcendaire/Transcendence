import { Tournament } from './tournament.js'
import { MatchmakingService } from './matchmaking.js'
import crypto from 'crypto'
import { match } from 'assert';
import { getDatabase } from '../db/databaseSingleton.js';

export class TournamentManagerService 
{
	private tournaments: Map<string, Tournament> = new Map();
	private matchmaking: MatchmakingService;
	private db = getDatabase();

	constructor(matchmaking: MatchmakingService)
	{
		this.matchmaking = matchmaking;
	}

	public createTournament(name: string, maxPlayers: number): void
	{
		try {
			this.db.createTournament(name, maxPlayers);

			const tournamentId = this.db.getTournament(undefined, name);
			if (!tournamentId)
				throw new Error(`createTournament: can't find tournament ${name} in database`);

			const tournament = new Tournament(tournamentId.id, name, maxPlayers, this.matchmaking);
			this.tournaments.set(tournamentId.id, tournament);

		} catch (error) {
			console.error(`createTournament: error creating tournament ${name}: `, error);
			throw error;
		}
	}

	public getTournament(id: string): Tournament | undefined
	{
		return this.tournaments.get(id);
	}

	private getStatusInFrench(status: string): string
	{
		if (status === 'created')
			return ('En attente');
		if (status === 'running')
			return ('En cours de jeu');
		return ('Terminé');
	}
	public listTournaments(): Array<{
	id: string;
	name: string;
	currentPlayers: number;
	maxPlayers: number;
	status: string;
	}>
	{
		const list = [];
		for (const [id, tournament] of this.tournaments.entries())
		{
			list.push({
				id: id,
				name: tournament.name,
				currentPlayers: tournament.getPlayerCount(),
				maxPlayers: tournament.maxPlayers,
				status: this.getStatusInFrench(tournament.getStatus())
			});
		}
		return list;
	}
}