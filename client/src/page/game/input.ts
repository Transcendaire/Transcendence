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

    const leftKeys = keys.KeyA || keys.KeyQ || keys.ArrowLeft;
    const rightKeys = keys.KeyD || keys.ArrowRight;
    const upKeys = keys.KeyW || keys.KeyZ || keys.ArrowUp;
    const downKeys = keys.KeyS || keys.ArrowDown;

    let up = false;
    let down = false;

    const playerCount = gameState.allPlayers.length;
    const idx = gameState.playerIndex;

    if (gameState.isBattleRoyale && playerCount === 3)
    {
        if (idx === 0)
        {
            up = leftKeys || upKeys;
            down = rightKeys || downKeys;
        }
        else if (idx === 1)
        {
            up = upKeys || leftKeys;
            down = downKeys || rightKeys;
        }
        else if (idx === 2)
        {
            up = downKeys || leftKeys;
            down = upKeys || rightKeys;
        }
    }
    else if (gameState.isBattleRoyale && playerCount === 4)
    {
        if (idx === 0)
        {
            up = leftKeys || upKeys;
            down = rightKeys || downKeys;
        }
        else if (idx === 1)
        {
            up = upKeys || rightKeys;
            down = downKeys || leftKeys;
        }
        else if (idx === 2)
        {
            up = rightKeys || downKeys;
            down = leftKeys || upKeys;
        }
        else if (idx === 3)
        {
            up = downKeys || leftKeys;
            down = upKeys || rightKeys;
        }
    }
    else if (gameState.isBattleRoyale && playerCount === 5)
    {
        if (idx === 0)
        {
            up = leftKeys || upKeys;
            down = rightKeys || downKeys;
        }
        else if (idx === 1)
        {
            up = upKeys || rightKeys;
            down = downKeys || leftKeys;
        }
        else if (idx === 2)
        {
            up = rightKeys || downKeys;
            down = leftKeys || upKeys;
        }
        else if (idx === 3)
        {
            up = downKeys || leftKeys;
            down = upKeys || rightKeys;
        }
        else if (idx === 4)
        {
            up = leftKeys || downKeys;
            down = rightKeys || upKeys;
        }
    }
    else if (gameState.isBattleRoyale && playerCount === 6)
    {
        if (idx === 0)
        {
            up = leftKeys || upKeys;
            down = rightKeys || downKeys;
        }
        else if (idx === 1)
        {
            up = upKeys || rightKeys;
            down = downKeys || leftKeys;
        }
        else if (idx === 2)
        {
            up = rightKeys || downKeys;
            down = leftKeys || upKeys;
        }
        else if (idx === 3)
        {
            up = rightKeys || downKeys;
            down = leftKeys || upKeys;
        }
        else if (idx === 4)
        {
            up = downKeys || leftKeys;
            down = upKeys || rightKeys;
        }
        else if (idx === 5)
        {
            up = leftKeys || upKeys;
            down = rightKeys || downKeys;
        }
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

    if (wsClient.isCustomGame()) {
        input.keys.slot1 = keys.Digit1;
        input.keys.slot2 = keys.Digit2;
        input.keys.slot3 = keys.Digit3;
    }

    wsClient.sendInput(input);
}
