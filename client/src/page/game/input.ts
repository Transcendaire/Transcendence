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

/**
 * @brief Send player input to server based on paddle angle
 */
export function sendInputToServer(): void
{
    if (!wsClient.isConnected() || !gameState.currentPlayerRole)
        return;

    const leftKeys = keys.KeyA || keys.KeyQ || keys.ArrowLeft;
    const rightKeys = keys.KeyD || keys.ArrowRight;
    const upKeys = keys.KeyW || keys.KeyZ || keys.ArrowUp;
    const downKeys = keys.KeyS || keys.ArrowDown;
    let up = false;
    let down = false;
    const player = gameState.allPlayers[gameState.playerIndex];
    const angle = player?.paddle?.angle;

    if (gameState.isBattleRoyale && angle !== undefined)
    {
        const angleDeg = (angle * 180) / Math.PI;
        console.log(`[INPUT] Player: ${player?.name}, Angle: ${angleDeg.toFixed(1)}°`);
        up = leftKeys || upKeys;
        down = rightKeys || downKeys;
    }
    else
    {
        up = upKeys || leftKeys;
        down = downKeys || rightKeys;
    }

    const input: GameInput = {
        playerId: gameState.currentPlayerRole,
        keys: { up, down }
    };

    if (wsClient.isCustomGame())
    {
        input.keys.slot1 = keys.Digit1;
        input.keys.slot2 = keys.Digit2;
        input.keys.slot3 = keys.Digit3;
    }
    wsClient.sendInput(input);
}
