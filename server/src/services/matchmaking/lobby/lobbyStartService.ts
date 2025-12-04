import { WebSocket } from 'ws'
import { Lobby, LobbyPlayer } from '@app/shared/types.js'
import { GameRoomManager } from '../game/gameRoomManager.js'
import { TournamentManagerService } from '../../tournament/tournamentManager.js'
import { LobbySocketTracker } from './lobbySocketTracker.js'
import { buildPlayerSocketMap, findPlayerSocket } from './lobbyHelpers.js'

/**
 * @brief Handles lobby game start logic for tournaments and battle royale
 */
export class LobbyStartService
{
	private gameRoomManager: GameRoomManager
	private tournamentManager: TournamentManagerService
	private socketTracker: LobbySocketTracker

	constructor(
		gameRoomManager: GameRoomManager,
		tournamentManager: TournamentManagerService,
		socketTracker: LobbySocketTracker
	)
	{
		this.gameRoomManager = gameRoomManager
		this.tournamentManager = tournamentManager
		this.socketTracker = socketTracker
	}

	/**
	 * @brief Start a tournament from lobby
	 * @param lobby Lobby to start
	 * @returns Error message or null on success
	 */
	public startTournament(lobby: Lobby): string | null
	{
		try
		{
			const uniqueName = `${lobby.name}-${Date.now()}`
			const tournamentId = this.tournamentManager.createTournament(
				uniqueName, lobby.players.length, lobby.settings)
			const tournament = this.tournamentManager.getTournament(tournamentId)

			if (!tournament)
				return "Failed to create tournament"
			const sockets = this.socketTracker.getLobbySockets(lobby.id)
			const socketMap = this.socketTracker.getSocketToPlayerIdMap()

			console.log(`[LOBBY] Adding ${lobby.players.length} players to tournament`)
			for (const player of lobby.players)
				this.addPlayerToTournament(tournament, player, sockets, socketMap)
			console.log(`[LOBBY] All players added, starting tournament`)
			tournament.runTournament()
			console.log(`[LOBBY] Tournament ${tournamentId} started`)
			return null
		}
		catch (error)
		{
			console.error(`[LOBBY] Failed to start tournament:`, error)
			return "Failed to start tournament"
		}
	}

	/**
	 * @brief Add single player to tournament
	 * @param tournament Tournament instance
	 * @param player Lobby player
	 * @param sockets Lobby sockets
	 * @param socketMap Socket to player ID map
	 */
	private addPlayerToTournament(
		tournament: any, player: LobbyPlayer,
		sockets: Set<WebSocket> | undefined,
		socketMap: Map<WebSocket, string>
	): void
	{
		if (player.isBot)
		{
			tournament.addBotToTournament(player.id, player.name)
			return
		}
		const playerSocket = findPlayerSocket(sockets, socketMap, player.id)

		console.log(`[LOBBY] Adding ${player.name} with socket: ${playerSocket ? 'YES' : 'NO'}`)
		tournament.addPlayerToTournament(player.name, playerSocket)
	}

	/**
	 * @brief Start a Battle Royale game from lobby
	 * @param lobby Lobby to start
	 */
	public startBattleRoyale(lobby: Lobby): void
	{
		const sockets = this.socketTracker.getLobbySockets(lobby.id)
		const socketMap = this.socketTracker.getSocketToPlayerIdMap()
		const playerIdToSocket = buildPlayerSocketMap(sockets, socketMap)

		this.gameRoomManager.createBattleRoyaleGame(
			lobby.players, playerIdToSocket,
			lobby.settings.powerUpsEnabled,
			lobby.settings.fruitFrequency,
			lobby.settings.lifeCount
		)
		console.log(`[LOBBY] Battle Royale started with ${lobby.players.length} players`)
	}
}
