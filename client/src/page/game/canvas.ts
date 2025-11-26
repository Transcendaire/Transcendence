import { PowerUpFruit } from "/dist/shared/types.js";
import { COLORS, FONTS } from "../../components/consts.js";
import * as gameState from './gameState.js';

export function render(): void
{
    if (!gameState.ctx || !gameState.canvas) return;
    
    gameState.ctx.fillStyle = COLORS.SONPI16_BLACK;
    gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);

    if (!gameState.player1 || !gameState.player2 || !gameState.ball) {
        console.warn('[GAME] render() appelé mais objets pas encore initialisés');
        return;
    }

    renderPaddle(gameState.player1.paddle, COLORS.SONPI16_ORANGE);
    renderPaddle(gameState.player2.paddle, COLORS.SONPI16_ORANGE);

    gameState.fruits.forEach(fruit => {
        renderFruit(fruit);
    });
    gameState.cloneBalls.forEach(clone => {
        renderCloneBall(clone);
    });
    renderBall(gameState.ball, COLORS.SONPI16_ORANGE);
}

export function renderPaddle(paddle: { positionX: number; positionY: number; height: number; }, color: string): void
{
    const x = Math.floor(paddle.positionX);
    const y = Math.floor(paddle.positionY);
    gameState.ctx.fillStyle = color;
    gameState.ctx.fillRect(x, y, 10, paddle.height);
    gameState.ctx.fillRect(x + 2, y-4 , 6, paddle.height+8);
}

export function renderBall(ball: { positionX: number; positionY: number; rotation: number; size: number }, color: string): void
{
    const centerX = ball.positionX + (ball.size / 2);
    const centerY = ball.positionY + (ball.size / 2);
    gameState.ctx.fillStyle = color;
    gameState.ctx.save();
    gameState.ctx.translate(centerX, centerY);
    gameState.ctx.rotate(ball.rotation);
    gameState.ctx.translate(-ball.size / 2, -ball.size / 2);
    gameState.ctx.fillRect(3, 0, 6, 3);
    gameState.ctx.fillRect(0, 3, 12, 3);
    gameState.ctx.fillRect(0, 6, 12, 3);
    gameState.ctx.fillRect(3, 9, 6, 3);
    gameState.ctx.restore();
}

export function renderFruit(fruit: PowerUpFruit): void
{
    const size = 30;
    const centerX = fruit.x + size / 2;
    const centerY = fruit.y + size / 2;
    const time = Date.now() / 1000;
    const rotation = (time * 0.5) % (Math.PI * 2);

    gameState.ctx.save();
    gameState.ctx.fillStyle = COLORS.SONPI16_ORANGE;
    gameState.ctx.font = `bold 32px ${FONTS.QUENCY_PIXEL}`;
    gameState.ctx.textAlign = "center";
    gameState.ctx.textBaseline = "middle";
    gameState.ctx.translate(centerX, centerY);
    gameState.ctx.rotate(rotation);
    gameState.ctx.fillText("R", 0, 0);
    gameState.ctx.restore();
}

export function renderCloneBall(clone: { x: number; y: number; vx: number; vy: number }): void
{
    const size = 12;
    const centerX = clone.x + size / 2;
    const centerY = clone.y + size / 2;

    gameState.ctx.save();
    gameState.ctx.globalAlpha = 0.8;
    gameState.ctx.fillStyle = COLORS.SONPI16_ORANGE;
    gameState.ctx.translate(centerX, centerY);
    gameState.ctx.translate(-size / 2, -size / 2);
    gameState.ctx.fillRect(3, 0, 6, 3);
    gameState.ctx.fillRect(0, 3, 12, 3);
    gameState.ctx.fillRect(0, 6, 12, 3);
    gameState.ctx.fillRect(3, 9, 6, 3);
    gameState.ctx.restore();
}

export function renderHearts(player: 'player1' | 'player2', lives: number): void
{
    const container = document.getElementById(
        `heartsPlayer${player === 'player1' ? '1' : '2'}`
    );
    
    if (!container)
        return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < lives; i++) {
        const heart = document.createElement('div');
        heart.className = 'w-16 h-16 flex items-center justify-center';
        heart.style.color = COLORS.SONPI16_ORANGE;
        heart.style.fontFamily = FONTS.QUENCY_PIXEL;
        heart.style.fontSize = '48px';
        heart.textContent = '♥';
        container.appendChild(heart);
    }
}

export function renderPowerUps(player: 'player1' | 'player2',
    itemSlots: (string | null)[],
    selectedSlots?: boolean[],
    pendingPowerUps?: (string | null)[],
    hitStreak?: number,
    chargingPowerUp?: string | null): void
{
    const container = document.getElementById(
        `powerUpsPlayer${player === 'player1' ? '1' : '2'}`
    );
    const slotImages: string[] = [
        './assets/images/son-256x.png',
        './assets/images/pi-256x.png',
        './assets/images/16-256x.png'
    ];
    const powerUpNames = ['Son', 'Pi', '16'];
    const outlineFilter = `drop-shadow(2px 0 0 ${COLORS.SONPI16_BLACK}) drop-shadow(-2px 0 0 ${COLORS.SONPI16_BLACK}) drop-shadow(0 2px 0 ${COLORS.SONPI16_BLACK}) drop-shadow(0 -2px 0 ${COLORS.SONPI16_BLACK})`;

    if (!container)
        return;
    
    container.innerHTML = '';
    
    for (let index = 0; index < 3; index++) {
        const slotDiv = document.createElement('div');
        const isSelected = selectedSlots?.[index] || false;
        const hasItem = itemSlots[index] !== null;
        const isCharging = chargingPowerUp === powerUpNames[index];
        const chargingLevel = isCharging ? (hitStreak || 0) : 0;

        slotDiv.className = `w-16 h-16 border-2 bg-sonpi16-orange rounded flex items-center justify-center transition-all duration-300`;
        
        if (isSelected) {
            slotDiv.style.borderColor = COLORS.SONPI16_BLACK;
            slotDiv.style.borderWidth = '3px';
            slotDiv.style.transform = 'scale(1.2)';
        } else {
            slotDiv.style.borderColor = COLORS.SONPI16_BLACK;
        }

        const imgContainer = document.createElement('div');
        imgContainer.className = 'w-12 h-12 relative';

        const img = document.createElement('img');
        img.src = slotImages[index]!;
        img.className = 'w-12 h-12 absolute top-0 left-0';
        img.alt = `Slot ${index + 1}`;
        
        if (!hasItem) {
            img.style.filter = outlineFilter;
        }
        
        imgContainer.appendChild(img);

        if (hasItem || isCharging) {
            const fillDiv = document.createElement('div');
            fillDiv.className = 'w-12 h-12 absolute top-0 left-0';
            fillDiv.style.backgroundColor = COLORS.SONPI16_BLACK;
            
            const maskStyle = `url(${slotImages[index]}) center / contain no-repeat`;
            fillDiv.style.mask = maskStyle;
            fillDiv.style.webkitMask = maskStyle;
            
            if (!hasItem) {
                fillDiv.style.filter = outlineFilter;
            }
            
            if (hasItem) {
                fillDiv.style.clipPath = 'inset(0 0 0 0)';
            } else {
                const fillPercentage = (chargingLevel / 3) * 100;
                fillDiv.style.clipPath = `inset(${100 - fillPercentage}% 0 0 0)`;
            }
            imgContainer.appendChild(fillDiv);
        }
        
        slotDiv.appendChild(imgContainer);
        container.appendChild(slotDiv);
    }
}
