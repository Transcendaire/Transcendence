import { Tournament } from './tournament.js'
import { MatchmakingService } from '../matchmaking/matchmaking.js'
import crypto from 'crypto'
import { match } from 'assert';
import { getDatabase } from '../../db/databaseSingleton.js';
import { DatabaseError, errTournament, TournamentError } from "@app/shared/errors.js";
import { CustomGameSettings } from '@app/shared/types.js';
import { WebSocket } from 'ws';

export class TournamentManagerService 
{
	private tournamentsMap: Map<string, Tournament> = new Map();
	private matchmaking: MatchmakingService;
	private db = getDatabase();

	constructor(matchmaking: MatchmakingService)
	{
		this.matchmaking = matchmaking;
	}

	/**
	 * @brief Creates a new tournament
	 * @param name Tournament name
	 * @param maxPlayers Maximum number of players allowed
	 * @param settings Game settings (powerUps, maxScore, etc.)
	 * @returns Tournament ID
	 * @throws {TournamentError} If tournament name already exists
	 * @throws {DatabaseError} If tournament creation fails
	 */
	public createTournament(name: string, maxPlayers: number, settings?: CustomGameSettings): string
	{
		try {
			const existingTournament = this.db.getTournament(undefined, name)
			if (existingTournament)
			{
				console.log(`[TOURNAMENT_MANAGER] Tournament ${name} already exists in DB, deleting it`)
				this.db.deleteTournament(existingTournament.id, undefined)
				this.tournamentsMap.delete(existingTournament.id)
			}
			this.db.createTournament(name, maxPlayers);
			const tournamentData = this.db.getTournament(undefined, name);
			if (!tournamentData)
				throw new DatabaseError(`Impossible de trouver le tournoi ${name} dans la base de données`);
			const tournament = new Tournament(tournamentData.id, name, maxPlayers, this.matchmaking, settings);
			this.tournamentsMap.set(tournamentData.id, tournament);
			return tournamentData.id;
		} catch (error) {
			console.error(`createTournament: error creating tournament ${name}: `, error);
			throw error;
		}
	}

	/**
	 * @brief Deletes a tournament from database and memory
	 * @param id Tournament UUID
	 * @throws Error if deletion fails
	 */
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

	/**
	 * @brief Retrieves a tournament by ID
	 * @param id Tournament UUID
	 * @returns Tournament instance or undefined if not found
	 */
	public getTournament(id: string): Tournament | undefined
	{
		return this.tournamentsMap.get(id);
	}

	/**
	 * @brief Loads all incomplete tournaments from database into memory
	 * @description Restores tournament state including players, skips completed tournaments
	 * @throws {TournamentError} If player restoration fails
	 */
	public loadTournamentsFromDatabase() //*useful for retrieving tournament infos if server crashes
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
						throw new TournamentError(`Impossible de rajouter un des joueurs au tournoi ${t.name}`); 
				}
			}

			tournament.setStatus(t.status);
			this.tournamentsMap.set(t.id, tournament);
		}
	}

	/**
	 * @brief Finds the tournament a player is currently in
	 * @param playerName Player's alias
	 * @returns Tournament instance or undefined if player not in any tournament
	 */
	public findTournamentOfPlayer(playerName: string): Tournament | undefined
	{
		for (const t of this.tournamentsMap.values())
		{
			if (t.hasPlayer(playerName))
				return t;
		}
		return undefined;
	}

	/**
	 * @brief Checks if a socket belongs to a player in an active (non-completed) tournament
	 * @param socket WebSocket connection to check
	 * @returns True if socket is in an active tournament
	 */
	public isPlayerInActiveTournament(socket: WebSocket): boolean
	{
		for (const tournament of this.tournamentsMap.values())
		{
			if (tournament.getStatus() !== 'completed' && tournament.hasPlayerSocket(socket))
				return true;
		}
		return false;
	}

	/**
	 * @brief Find tournament by player socket
	 * @param socket WebSocket connection to search for
	 * @returns Tournament instance or undefined if not found
	 */
	public findTournamentBySocket(socket: WebSocket): Tournament | undefined
	{
		for (const tournament of this.tournamentsMap.values())
		{
			if (tournament.getStatus() !== 'completed' && tournament.hasPlayerSocket(socket))
				return tournament;
		}
		return undefined;
	}

	/**
	 * @brief Checks if a player name is in an active (non-completed) tournament
	 * @param playerName Player's name to check
	 * @returns True if player is active (not eliminated) in a running tournament
	 */
	public isPlayerNameInActiveTournament(playerName: string): boolean
	{
		for (const tournament of this.tournamentsMap.values())
		{
			if (tournament.getStatus() !== 'completed' && tournament.hasActivePlayer(playerName))
				return true;
		}
		return false;
	}

	/**
	 * @brief Lists all active tournaments with their details
	 * @returns Array of tournament info objects with id, name, player counts, and status
	 */
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

	/**
	 * @brief Lists all active tournaments with their details
	 * @returns Array of tournament info objects with id, name, player counts, and status
	 */
	public listTournaments(): Array<{
	id: string;
	name: string;
	currentPlayers: number;
	maxPlayers: number;
	status: string;
	}>
	{
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

	/**
	 * @brief Removes all tournaments from memory
	 */
	public clearAll(): void
	{
		this.tournamentsMap.clear();
	}

	public getNumberOfTournaments(): number
	{
		return this.tournamentsMap.size;
	}
}