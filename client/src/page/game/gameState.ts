import { Player } from "@shared/models/Player";
import { Ball } from "@shared/models/Ball";
import { PowerUpFruit, PolygonData, PlayerState, Point2D } from  "@shared/types";

export let canvas: HTMLCanvasElement;
export let ctx: CanvasRenderingContext2D;

export let lastTime = 0;
export let player1: Player;
export let player2: Player;
export let ball: Ball;
export let balls: Array<{ x: number; y: number; vx: number; vy: number }> = [];
export let cloneBalls: Array<{ x: number; y: number; vx: number; vy: number }> = [];
export let fruits: PowerUpFruit[] = [];
export let currentPlayerRole: 'player1' | 'player2' | null = null;
export let gameRunning = false;
export let cleanupHandlers: (() => void)[] = [];
export let animationFrameId: number | null = null;
export let isReturningToLobby = false;

export let isBattleRoyale = false;
export let polygonData: PolygonData | null = null;
export let playerIndex = 0;
export let allPlayers: PlayerState[] = [];

export let tournamentCountdown: { opponentName: string; countdown: number } | null = null;
export let isInTournament: boolean = false;
export let tournamentSiblingMatch: { player1Name: string; player2Name: string; lives1: number; lives2: number } | null = null;
export let tournamentOtherMatches: Array<{ player1Name: string; player2Name: string; lives1: number; lives2: number }> = [];
export let isWaitingForTournamentMatch = false;

export function setCanvas(c: HTMLCanvasElement): void {
    canvas = c;
}

export function setCtx(c: CanvasRenderingContext2D): void {
    ctx = c;
}

export function setLastTime(t: number): void {
    lastTime = t;
}

export function setPlayer1(p: Player | null): void {
    player1 = p as Player;
}

export function setPlayer2(p: Player | null): void {
    player2 = p as Player;
}

export function setBall(b: Ball | null): void {
    ball = b as Ball;
}

export function setBalls(b: Array<{ x: number; y: number; vx: number; vy: number }>): void {
    balls = b;
}

export function setCloneBalls(cb: Array<{ x: number; y: number; vx: number; vy: number }>): void {
    cloneBalls = cb;
}

export function setFruits(f: PowerUpFruit[]): void {
    fruits = f;
}

export function setCurrentPlayerRole(r: 'player1' | 'player2' | null): void {
    currentPlayerRole = r;
}

export function setGameRunning(g: boolean): void {
    gameRunning = g;
}

export function addCleanupHandler(handler: () => void): void {
    cleanupHandlers.push(handler);
}

export function clearCleanupHandlers(): void {
    for (const cleanup of cleanupHandlers)
        cleanup();
    cleanupHandlers = [];
}

export function setAnimationFrameId(id: number | null): void {
    animationFrameId = id;
}

export function setIsReturningToLobby(r: boolean): void {
    isReturningToLobby = r;
}

export function setIsBattleRoyale(b: boolean): void {
    isBattleRoyale = b;
}

export function setPolygonData(p: PolygonData | null): void {
    polygonData = p;
}

export function setPlayerIndex(i: number): void {
    playerIndex = i;
}

export function setAllPlayers(p: PlayerState[]): void {
    allPlayers = p;
}

export function setTournamentCountdown(data: { opponentName: string; countdown: number } | null): void {
    tournamentCountdown = data;
}

export function setIsInTournament(value: boolean): void {
    isInTournament = value;
}

export function setTournamentSiblingMatch(match: { player1Name: string; player2Name: string; lives1: number; lives2: number } | null): void {
    tournamentSiblingMatch = match;
}

export function setTournamentOtherMatches(matches: Array<{ player1Name: string; player2Name: string; lives1: number; lives2: number }>): void {
    tournamentOtherMatches = matches;
}

export function setIsWaitingForTournamentMatch(waiting: boolean): void {
    isWaitingForTournamentMatch = waiting;
}