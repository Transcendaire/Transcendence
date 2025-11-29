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
 * @brief Get raw directional input from keyboard
 * @returns Object with left, right, up, down booleans
 */
function getRawInput(): { left: boolean; right: boolean; up: boolean; down: boolean }
{
    return {
        left: keys.KeyA || keys.KeyQ || keys.ArrowLeft,
        right: keys.KeyD || keys.ArrowRight,
        up: keys.KeyW || keys.KeyZ || keys.ArrowUp,
        down: keys.KeyS || keys.ArrowDown
    };
}

/**
 * @brief Compute paddle movement based on angle quadrant
 * @param angleDeg Paddle angle in degrees (-180 to 180)
 * @param raw Raw keyboard input
 * @returns Object with up/down paddle movement
 */
function computeBRMovement(
    angleDeg: number,
    raw: { left: boolean; right: boolean; up: boolean; down: boolean }
): { up: boolean; down: boolean }
{
    const inQ1 = angleDeg >= 0 && angleDeg < 90;
    const inQ2 = angleDeg >= 90 && angleDeg <= 180;
    const inQ3 = angleDeg >= -180 && angleDeg < -90;
    const inQ4 = angleDeg >= -90 && angleDeg < 0;
    const moveLeft =
        (inQ1 && (raw.left || raw.up)) ||
        (inQ2 && (raw.right || raw.up)) ||
        (inQ3 && (raw.right || raw.down)) ||
        (inQ4 && (raw.left || raw.down));
    const moveRight =
        (inQ1 && (raw.right || raw.down)) ||
        (inQ2 && (raw.left || raw.down)) ||
        (inQ3 && (raw.left || raw.up)) ||
        (inQ4 && (raw.right || raw.up));
    return { up: moveLeft, down: moveRight };
}

/**
 * @brief Send player input to server based on paddle angle
 */
export function sendInputToServer(): void
{
    if (!wsClient.isConnected() || !gameState.currentPlayerRole)
        return;

    const raw = getRawInput();
    let up = raw.up || raw.left;
    let down = raw.down || raw.right;
    const player = gameState.allPlayers[gameState.playerIndex];
    const angle = player?.paddle?.angle;

    if (gameState.isBattleRoyale && angle !== undefined)
    {
        const angleDeg = (angle * 180) / Math.PI;
        const movement = computeBRMovement(angleDeg, raw);
        up = movement.up;
        down = movement.down;
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
