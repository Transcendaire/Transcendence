import { Player } from "/dist/shared/models/Player.js";
import { Ball } from "/dist/shared/models/Ball.js";
import { PowerUpFruit } from "/dist/shared/types.js";

export let canvas: HTMLCanvasElement;
export let ctx: CanvasRenderingContext2D;

export let lastTime = 0;
export let player1: Player;
export let player2: Player;
export let ball: Ball;
export let cloneBalls: Array<{ x: number; y: number; vx: number; vy: number }> = [];
export let fruits: PowerUpFruit[] = [];
export let currentPlayerRole: 'player1' | 'player2' | null = null;
export let gameRunning = false;
export let cleanupHandlers: (() => void)[] = [];
export let animationFrameId: number | null = null;
export let isReturningToLobby = false;

export function setCanvas(c: HTMLCanvasElement): void {
    canvas = c;
}

export function setCtx(c: CanvasRenderingContext2D): void {
    ctx = c;
}

export function setLastTime(t: number): void {
    lastTime = t;
}

export function setPlayer1(p: Player): void {
    player1 = p;
}

export function setPlayer2(p: Player): void {
    player2 = p;
}

export function setBall(b: Ball): void {
    ball = b;
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
