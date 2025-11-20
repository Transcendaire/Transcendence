import { WebSocket } from 'ws';
import { MatchmakingService } from './matchmaking/matchmaking.js';
import { getDatabase } from '../db/databaseSingleton.js';
import { Tournament, Player } from '../types.js';


interface TournamentPlayer {
	id: string;
	alias: string;
	status: 'waiting' | 'playing' | 'eliminated' | 'champion'
}


interface Match {
	id: string;
	player1Id: string;
	player2Id: string;
	winnerId?: string;
	round: number;
	status: "pending" | "playing" | "completed";
}

export class TournamentService {

		


}