import { wsClient } from "../../components/WebSocketClient";
import type { GameInput } from "@shared/types";
import * as gameState from './gameState';

export const keys = {
    KeyA: false,
    KeyQ: false,
    KeyD: false,
    KeyW: false,
    KeyZ: false,
    KeyS: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Digit1: false,
    Digit2: false,
    Digit3: false
};

export function setupGameEventListeners(): void
{
    window.addEventListener('keydown', (e) => {
        keys[e.code as keyof typeof keys] = true;
    });
    window.addEventListener('keyup', (e) => {
        keys[e.code as keyof typeof keys] = false;
    });
}

export function sendInputToServer(): void
{
    if (!wsClient.isConnected() || !gameState.currentPlayerRole) return;

    const input: GameInput = {
        playerId: gameState.currentPlayerRole,
        keys: {
            up: keys.KeyQ || keys.KeyW || keys.KeyZ || keys.KeyA || keys.ArrowUp || keys.ArrowRight,
            down: keys.KeyD || keys.KeyS || keys.ArrowDown || keys.ArrowLeft
        }
    };

    if (wsClient.isCustomGame()) {
        input.keys.slot1 = keys.Digit1;
        input.keys.slot2 = keys.Digit2;
        input.keys.slot3 = keys.Digit3;
    }

    wsClient.sendInput(input);
}
