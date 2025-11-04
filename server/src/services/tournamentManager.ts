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

	public createTournament(name: string, maxPlayers: number): string
	{
		try {
			this.db.createTournament(name, maxPlayers);

			const tournamentData = this.db.getTournament(undefined, name);
			if (!tournamentData)
				throw new Error(`createTournament: can't find tournament ${name} in database`);

			const tournament = new Tournament(tournamentData.id, name, maxPlayers, this.matchmaking);
			this.tournaments.set(tournamentData.id, tournament);

			return tournamentData.id;
		} catch (error) {
			console.error(`createTournament: error creating tournament ${name}: `, error);
			throw error;
		}
	}

	public getTournament(id: string): Tournament | undefined
	{
		return this.tournaments.get(id);
	}

	public findTournamentOfPlayer(playerName: string): Tournament | undefined
	{
		for (const t of this.tournaments.values())
		{
			if (t.hasPlayer(playerName))
				return t;
		}
		return undefined;
	}

	private getStatusInFrench(status: string): string
	{
		switch (status) {
			case 'created':
				return 'En attente';
			case 'full':
				return 'Complet';
			case 'running':
				return 'En cours de jeu';
			default:
				return 'Terminé';
		}
	}
	public listTournaments(): Array<{
	id: string;
	name: string;
	currentPlayers: number;
	maxPlayers: number;
	status: string;
	}>
	{
		console.log(`📋 Listing ${this.tournaments.size} tournaments:`);
		const list = [];
		for (const [id, tournament] of this.tournaments.entries())
		{
			const count = tournament.getPlayerCount();
			console.log(`   - ${tournament.name}: ${count}/${tournament.maxPlayers} players`);
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