import { Tournament } from './tournament.js'
import { MatchmakingService } from './matchmaking.js'
import crypto from 'crypto'
import { match } from 'assert';
import { getDatabase } from '../db/databaseSingleton.js';
import { DatabaseError, errTournament, TournamentError } from '../../../shared/errors.js';

export class TournamentManagerService 
{
	private tournamentsMap: Map<string, Tournament> = new Map();
	private matchmaking: MatchmakingService;
	private db = getDatabase();

	constructor(matchmaking: MatchmakingService)
	{
		this.matchmaking = matchmaking;
	}

	public createTournament(name: string, maxPlayers: number): string
	{
		try {
			if (this.db.getTournament(undefined, name))
				throw new TournamentError(`Le tournoi ${name} existe déjà et ne peut pas être créé`, errTournament.ALREADY_EXISTING)
			this.db.createTournament(name, maxPlayers);

			const tournamentData = this.db.getTournament(undefined, name);
			if (!tournamentData)
				throw new DatabaseError(`Impossible de trouver le tournoi ${name} dans la base de données`);

			const tournament = new Tournament(tournamentData.id, name, maxPlayers, this.matchmaking);
			this.tournamentsMap.set(tournamentData.id, tournament);

			return tournamentData.id;
		} catch (error) {
			console.error(`createTournament: error creating tournament ${name}: `, error);
			throw error;
		}
	}

	public deleteTournament(id: string): void
	{
		try {
			this.db.deleteTournament(id, undefined);
			this.tournamentsMap.delete(id);
		} catch (error)
		{
			console.log(error);
			throw error;
		}
	}

	public getTournament(id: string): Tournament | undefined
	{
		return this.tournamentsMap.get(id);
	}

	public loadTournamentsFromDatabase()
	{
		const allTournaments = this.db.getAllTournaments();
		if (!allTournaments || allTournaments.length === 0)
			return ;

		for (const t of allTournaments)
		{
			if (t.status === 'completed')
				continue ;
			if (this.tournamentsMap.has(t.id))
				continue ;
			const tournament = new Tournament(
				t.id,
				t.name,
				t.max_players,
				this.matchmaking
			)

			const tournamentPlayers = this.db.getTournamentPlayers(t.id);
			if (tournamentPlayers && tournamentPlayers.length > 0)
			{
				for (const p of tournamentPlayers)
				{
					const player = this.db.getPlayer(p.alias);
					if (player)
						tournament.restorePlayer(player);
					else
						throw new TournamentError(`Impossible de rajouter un des joueurs au tournoi ${t.name}`);//!verifier que c bien catch
				}
			}

			tournament.setStatus(t.status);
			this.tournamentsMap.set(t.id, tournament);
		}
	}

	public findTournamentOfPlayer(playerName: string): Tournament | undefined
	{
		for (const t of this.tournamentsMap.values())
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
		console.log(`📋 Listing ${this.tournamentsMap.size} tournaments:`);
		const list = [];
		for (const [id, tournament] of this.tournamentsMap.entries())
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

	public clearAll(): void {
		this.tournamentsMap.clear();
	}
}