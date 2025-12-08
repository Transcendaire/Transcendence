import { PowerUpFruit, Point2D, PlayerState } from "@shared/types";
import { BR_PADDLE_LENGTH, BR_PADDLE_WIDTH } from "@shared/consts";
import { COLORS, FONTS } from "../../components/consts";
import * as gameState from './gameState';
import { wsClient } from "../../components/WebSocketClient";
import {
	drawPolygonArena,
	drawCornerZones,
	getPaddlePositionOnSide
} from './polygon';

const powerUpImages: HTMLImageElement[] = [];
const powerUpImagePaths = [
	'./assets/images/son-256x.png',
	'./assets/images/pi-256x.png',
	'./assets/images/16-256x.png'
];
let imagesLoaded = false;

function loadPowerUpImages(): void
{
	if (imagesLoaded) return;
	for (let i = 0; i < powerUpImagePaths.length; i++)
	{
		const img = new Image();
		img.src = powerUpImagePaths[i]!;
		powerUpImages[i] = img;
	}
	imagesLoaded = true;
}

/**
 * @brief Main render function - delegates to classic or polygon mode
 */
export function render(): void
{
	if (!gameState.ctx || !gameState.canvas) return;

	gameState.ctx.fillStyle = COLORS.SONPI16_BLACK;
	gameState.ctx.fillRect(0, 0, gameState.canvas.width, gameState.canvas.height);

	if (gameState.tournamentCountdown)
		return renderTournamentCountdown();

	if (gameState.isWaitingForTournamentMatch)
		return renderWaitingForMatch();

	if (gameState.isBattleRoyale)
	{
		if (gameState.polygonData)
		{
			gameState.canvas.style.border = 'none';
			renderPolygonMode();
		}
		else
		{
			gameState.canvas.style.border = '2px solid ' + COLORS.SONPI16_ORANGE;
			renderBattleRoyaleClassicMode();
		}
	}
	else
	{
		gameState.canvas.style.border = '2px solid ' + COLORS.SONPI16_ORANGE;
		renderClassicMode();
	}
}

/**
 * @brief Render classic 2-player rectangle mode
 */
function renderClassicMode(): void
{
	if (!gameState.player1 || !gameState.player2 || !gameState.ball)
	{
		console.warn('[GAME] render() appelé mais objets pas encore initialisés');
		return;
	}

	const isPlayer1 = gameState.currentPlayerRole === 'player1';
	renderPaddle(gameState.player1.paddle, isPlayer1 ? COLORS.SONPI16_BLUE : COLORS.SONPI16_ORANGE);
	renderPaddle(gameState.player2.paddle, isPlayer1 ? COLORS.SONPI16_ORANGE : COLORS.SONPI16_BLUE);

	gameState.fruits.forEach(fruit => renderFruit(fruit));
	gameState.cloneBalls.forEach(clone => renderCloneBall(clone));
	renderBall(gameState.ball, COLORS.SONPI16_ORANGE);
}

/**
 * @brief Render Battle Royale in classic mode (when only 2 players remain)
 */
function renderBattleRoyaleClassicMode(): void
{
	const players = gameState.allPlayers;
	const activePlayers = players.filter(p => !p.isEliminated);

	if (activePlayers.length < 2 || !gameState.ball)
	{
		console.warn('[GAME] BR classic mode: pas assez de joueurs ou balle non initialisée');
		return;
	}

	const player1 = activePlayers[0]!;
	const player2 = activePlayers[1]!;
	const player1Idx = players.indexOf(player1);
	const player2Idx = players.indexOf(player2);

	const currentPlayer = players[gameState.playerIndex];
	const isSpectator = currentPlayer?.isEliminated ?? true;
	const isCurrentPlayer1 = !isSpectator && player1Idx === gameState.playerIndex;
	const isCurrentPlayer2 = !isSpectator && player2Idx === gameState.playerIndex;

	const paddle1 = {
		positionX: player1.paddle.x ?? 20,
		positionY: player1.paddle.y,
		height: 100
	};
	const paddle2 = {
		positionX: player2.paddle.x ?? (gameState.canvas.width - 30),
		positionY: player2.paddle.y,
		height: 100
	};

	const color1 = isCurrentPlayer1 ? COLORS.SONPI16_BLUE : COLORS.SONPI16_ORANGE;
	const color2 = isCurrentPlayer2 ? COLORS.SONPI16_BLUE : COLORS.SONPI16_ORANGE;

	renderPaddle(paddle1, color1);
	renderPaddle(paddle2, color2);

	gameState.fruits.forEach(fruit => renderFruit(fruit));
	gameState.cloneBalls.forEach(clone => renderCloneBall(clone));
	renderBall(gameState.ball, COLORS.SONPI16_ORANGE);

	renderBRClassicUI(player1, player2, color1, color2);

	const p1Role: 'player1' | 'player2' = isCurrentPlayer1 ? 'player1' : 'player2';
	const p2Role: 'player1' | 'player2' = isCurrentPlayer2 ? 'player1' : 'player2';

	renderHearts('player1', player1.lives);
	renderHearts('player2', player2.lives);

	if (wsClient.isCustomGame())
	{
		if (player1.itemSlots)
			renderPowerUps(p1Role, player1.itemSlots, player1.selectedSlots, undefined, player1.hitStreak, player1.chargingPowerUp);
		if (player2.itemSlots)
			renderPowerUps(p2Role, player2.itemSlots, player2.selectedSlots, undefined, player2.hitStreak, player2.chargingPowerUp);
	}
}

/**
 * @brief Render UI for BR classic mode (names and lives)
 */
function renderBRClassicUI(
	player1: PlayerState,
	player2: PlayerState,
	color1: string,
	color2: string
): void
{
	const ctx = gameState.ctx;
	const y = 25;

	ctx.font = `16px ${FONTS.QUENCY_PIXEL}`;
	ctx.textBaseline = 'middle';

	ctx.fillStyle = color1;
	ctx.textAlign = 'left';
	ctx.fillText(player1.name || 'P1', 50, y);
	const lives1 = player1.lives;
	for (let i = 0; i < lives1; i++)
		ctx.fillText('♥', 50 + (player1.name?.length ?? 2) * 10 + 10 + i * 15, y);

	ctx.fillStyle = color2;
	ctx.textAlign = 'right';
	ctx.fillText(player2.name || 'P2', gameState.canvas.width - 50, y);
	const lives2 = player2.lives;
	const p2NameLen = player2.name?.length ?? 2;
	for (let i = 0; i < lives2; i++)
		ctx.fillText('♥', gameState.canvas.width - 50 - p2NameLen * 10 - 10 - i * 15, y);
}

/**
 * @brief Render polygon Battle Royale mode with N players
 */
function renderPolygonMode(): void
{
	const polygon = gameState.polygonData!;
	const players = gameState.allPlayers;
	const cornerRadius = polygon.cornerRadius ?? 15;
	const numSides = polygon.sides.length;
	const activeSideIndices = Array.from({ length: numSides }, (_, i) => i);

	drawPolygonArena(gameState.ctx, polygon.vertices, activeSideIndices);
	drawCornerZones(gameState.ctx, polygon.vertices, cornerRadius);

	for (let i = 0; i < players.length; i++)
	{
		const player = players[i];
		if (!player || player.isEliminated)
			continue;

		const isCurrentPlayer = i === gameState.playerIndex;
		const color = isCurrentPlayer ? COLORS.SONPI16_BLUE : COLORS.SONPI16_ORANGE;
		const paddleX = player.paddle.x;
		const paddleY = player.paddle.y;
		const paddleAngle = player.paddle.angle;
		const paddleLength = player.paddle.length ?? BR_PADDLE_LENGTH;
		const paddleWidth = player.paddle.width ?? BR_PADDLE_WIDTH;

		if (paddleX === undefined || paddleY === undefined || paddleAngle === undefined)
			continue;

		renderPolygonPaddleAtPosition(
			paddleX,
			paddleY,
			paddleAngle,
			paddleLength,
			paddleWidth,
			color
		);
	}

	gameState.fruits.forEach(fruit => renderFruit(fruit));
	gameState.cloneBalls.forEach(clone => renderCloneBall(clone));

	if (gameState.balls && gameState.balls.length > 0)
		gameState.balls.forEach(ball => renderBRBall(ball));
	else if (gameState.ball)
		renderBall(gameState.ball, COLORS.SONPI16_ORANGE);

	renderPolygonUI(players, polygon);
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

/**
 * @brief Render a Battle Royale ball
 */
export function renderBRBall(ball: { x: number; y: number; vx: number; vy: number }): void
{
    const size = 12;
    const centerX = ball.x + size / 2;
    const centerY = ball.y + size / 2;

    gameState.ctx.save();
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

/**
 * @brief Render a rotated paddle at a specific position
 * @param x Paddle center X
 * @param y Paddle center Y
 * @param angle Paddle rotation angle
 * @param paddleLength Paddle length
 * @param paddleWidth Paddle width
 * @param color Paddle color
 */
function renderPolygonPaddleAtPosition(
	x: number,
	y: number,
	angle: number,
	paddleLength: number,
	paddleWidth: number,
	color: string
): void
{
	gameState.ctx.save();
	gameState.ctx.translate(x, y);
	gameState.ctx.rotate(angle);
	gameState.ctx.fillStyle = color;
	gameState.ctx.fillRect(-paddleLength / 2, -paddleWidth / 2, paddleLength, paddleWidth);
	gameState.ctx.fillRect(-paddleLength / 2 + 4, -paddleWidth / 2 - 3, paddleLength - 8, paddleWidth + 6);
	gameState.ctx.restore();
}

/**
 * @brief Render a rotated paddle for polygon mode (using sidePosition)
 * @param side SideData for the paddle's side
 * @param sidePosition Position along side (0-1)
 * @param angle Paddle rotation angle
 * @param paddleLength Paddle length
 * @param paddleWidth Paddle width
 * @param color Paddle color
 */
function renderPolygonPaddle(
	side: { start: Point2D; end: Point2D; center: Point2D; angle: number; length: number },
	sidePosition: number,
	angle: number,
	paddleLength: number,
	paddleWidth: number,
	color: string
): void
{
	const pos = getPaddlePositionOnSide(side, sidePosition, paddleLength, paddleWidth);
	renderPolygonPaddleAtPosition(pos.x, pos.y, angle, paddleLength, paddleWidth, color);
}

/**
 * @brief Render UI elements (lives, names, powerups) for polygon mode around the arena
 * @param players Array of player states
 * @param polygon PolygonData with vertices and sides
 */
function renderPolygonUI(
	players: PlayerState[],
	polygon: { vertices: Point2D[]; sides: { center: Point2D; angle: number }[] }
): void
{
	const ctx = gameState.ctx;
	let sideIdx = 0;

	for (let i = 0; i < players.length; i++)
	{
		const player = players[i];
		if (!player || player.isEliminated)
			continue;

		const side = polygon.sides[sideIdx];
		if (!side)
		{
			sideIdx++;
			continue;
		}

		const isCurrentPlayer = i === gameState.playerIndex;
		const color = isCurrentPlayer ? COLORS.SONPI16_BLUE : COLORS.SONPI16_ORANGE;
		const normalAngle = side.angle - Math.PI / 2;
		const offset = 60;
		const uiX = side.center.x + Math.cos(normalAngle) * offset;
		const uiY = side.center.y + Math.sin(normalAngle) * offset;

		ctx.save();
		ctx.translate(uiX, uiY);
		ctx.rotate(side.angle);

		ctx.fillStyle = color;
		ctx.font = `16px ${FONTS.QUENCY_PIXEL}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(player.name || `P${i + 1}`, 0, -25);

		const lives = player.lives;
		const heartSpacing = 12;
		const heartsWidth = lives * heartSpacing;
		const startX = -heartsWidth / 2 + heartSpacing / 2;

		ctx.font = `14px ${FONTS.QUENCY_PIXEL}`;
		for (let h = 0; h < lives; h++)
			ctx.fillText('♥', startX + h * heartSpacing, -8);

		if (wsClient.isCustomGame() && player.itemSlots)
		{
			renderPolygonPowerUpSlots(
				ctx,
				player.itemSlots,
				player.selectedSlots,
				player.hitStreak,
				player.chargingPowerUp,
				isCurrentPlayer
			);
		}

		ctx.restore();
		sideIdx++;
	}
}

/**
 * @brief Render power-up slots for a player in polygon mode
 * @param ctx Canvas context
 * @param itemSlots Player's item slots
 * @param selectedSlots Which slots are selected
 * @param hitStreak Current hit streak
 * @param chargingPowerUp Currently charging power-up
 * @param isCurrentPlayer Whether this is the current player (for blue color)
 */
function renderPolygonPowerUpSlots(
	ctx: CanvasRenderingContext2D,
	itemSlots: (string | null)[],
	selectedSlots?: boolean[],
	hitStreak?: number,
	chargingPowerUp?: string | null,
	isCurrentPlayer?: boolean
): void
{
	loadPowerUpImages();

	const slotSize = 20;
	const slotSpacing = 24;
	const totalWidth = 3 * slotSpacing;
	const startX = -totalWidth / 2 + slotSpacing / 2;
	const y = 12;
	const powerUpNames = ['Son', 'Pi', '16'];
	const bgColor = COLORS.SONPI16_ORANGE;

	for (let i = 0; i < 3; i++)
	{
		const x = startX + i * slotSpacing;
		const hasItem = itemSlots[i] !== null;
		const isSelected = selectedSlots?.[i] || false;
		const isCharging = chargingPowerUp === powerUpNames[i];
		const img = powerUpImages[i];

		ctx.fillStyle = bgColor;
		ctx.fillRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize);

		ctx.strokeStyle = COLORS.SONPI16_BLACK;
		ctx.lineWidth = isSelected ? 3 : 2;
		ctx.strokeRect(x - slotSize / 2, y - slotSize / 2, slotSize, slotSize);

		if (img && img.complete)
		{
			const imgSize = slotSize - 4;
			const imgX = x - imgSize / 2;
			const imgY = y - imgSize / 2;
			const outlineOffset = 1;
			const outlineOffsets: [number, number][] = [
				[outlineOffset, 0], [-outlineOffset, 0], [0, outlineOffset], [0, -outlineOffset]
			];

			if (!hasItem)
			{
				ctx.globalAlpha = 1;
				ctx.globalCompositeOperation = 'source-over';
				for (const offset of outlineOffsets)
				{
					ctx.drawImage(img, imgX + offset[0], imgY + offset[1], imgSize, imgSize);
					ctx.fillStyle = COLORS.SONPI16_BLACK;
					ctx.globalCompositeOperation = 'source-atop';
					ctx.fillRect(imgX + offset[0] - 2, imgY + offset[1] - 2, imgSize + 4, imgSize + 4);
					ctx.globalCompositeOperation = 'source-over';
				}
			}

			ctx.drawImage(img, imgX, imgY, imgSize, imgSize);

			if (hasItem || isCharging)
			{
				const chargingLevel = isCharging ? (hitStreak || 0) : 3;
				const fillPercent = hasItem ? 1 : (chargingLevel / 3);
				const fillHeight = imgSize * fillPercent;
				const fillY = imgY + imgSize - fillHeight;

				ctx.save();
				ctx.beginPath();
				ctx.rect(imgX, fillY, imgSize, fillHeight);
				ctx.clip();
				ctx.fillStyle = COLORS.SONPI16_BLACK;
				ctx.globalAlpha = 0.9;
				ctx.drawImage(img, imgX, imgY, imgSize, imgSize);
				ctx.globalCompositeOperation = 'source-atop';
				ctx.fillRect(imgX - 1, imgY - 1, imgSize + 2, imgSize + 2);
				ctx.restore();
			}
		}
	}

	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
}

/**
 * @brief Render tournament countdown before match starts
 */
function renderTournamentCountdown(): void
{
	const ctx = gameState.ctx;
	const canvas = gameState.canvas;
	const countdown = gameState.tournamentCountdown;
	
	if (!ctx || !canvas || !countdown) return;
	
	ctx.fillStyle = COLORS.SONPI16_BLACK;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	
	ctx.fillStyle = COLORS.SONPI16_ORANGE;
	ctx.font = '32px ' + FONTS.QUENCY_PIXEL;
	ctx.fillText('Vous allez jouer contre', canvas.width / 2, canvas.height / 2 - 80);
	
	ctx.fillStyle = COLORS.SONPI16_BLUE;
	ctx.font = '48px ' + FONTS.QUENCY_PIXEL;
	ctx.fillText(countdown.opponentName, canvas.width / 2, canvas.height / 2 - 20);
	
	ctx.fillStyle = COLORS.SONPI16_ORANGE;
	ctx.font = '96px ' + FONTS.QUENCY_PIXEL;
	const countText = countdown.countdown > 0 ? countdown.countdown.toString() : 'GO!';
	ctx.fillText(countText, canvas.width / 2, canvas.height / 2 + 80);
}

/**
 * @brief Render waiting screen with ongoing match updates
 */
function renderWaitingForMatch(): void
{
	const ctx = gameState.ctx;
	const canvas = gameState.canvas;
	const siblingMatch = gameState.tournamentSiblingMatch;
	const otherMatches = gameState.tournamentOtherMatches;
	
	if (!ctx || !canvas) return;
	
	ctx.fillStyle = COLORS.SONPI16_BLACK;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	
	ctx.fillStyle = COLORS.SONPI16_ORANGE;
	ctx.font = '36px ' + FONTS.QUENCY_PIXEL;
	ctx.fillText('En attente du prochain match...', canvas.width / 2, 60);
	
	let currentY = 120;
	
	if (siblingMatch)
	{
		ctx.fillStyle = COLORS.SONPI16_ORANGE;
		ctx.font = '24px ' + FONTS.QUENCY_PIXEL;
		ctx.fillText('Vous jouerez contre le gagnant de:', canvas.width / 2, currentY);
		currentY += 50;
		
		renderMatchCard(ctx, canvas, siblingMatch, currentY, true);
		currentY += 120;
	}
	
	if (otherMatches.length > 0)
	{
		ctx.fillStyle = COLORS.SONPI16_BLUE;
		ctx.font = '22px ' + FONTS.QUENCY_PIXEL;
		ctx.fillText('Autres matchs en cours:', canvas.width / 2, currentY);
		currentY += 40;
		
		for (const match of otherMatches)
		{
			renderMatchCard(ctx, canvas, match, currentY, false);
			currentY += 100;
		}
	}
	else if (!siblingMatch)
	{
		ctx.font = '24px ' + FONTS.QUENCY_PIXEL;
		ctx.fillText('Aucun match en cours', canvas.width / 2, canvas.height / 2);
	}
	
	ctx.textAlign = 'left';
}

/**
 * @brief Render a match card with player names and scores
 */
function renderMatchCard(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, match: { player1Name: string; player2Name: string; lives1: number; lives2: number }, y: number, isHighlighted: boolean): void
{
	const nameColor = isHighlighted ? '#FFD700' : COLORS.SONPI16_BLUE;
	
	ctx.fillStyle = nameColor;
	ctx.font = '28px ' + FONTS.QUENCY_PIXEL;
	ctx.textAlign = 'right';
	ctx.fillText(match.player1Name, canvas.width / 2 - 60, y);
	
	ctx.fillStyle = COLORS.SONPI16_ORANGE;
	ctx.textAlign = 'center';
	ctx.fillText('VS', canvas.width / 2, y);
	
	ctx.fillStyle = nameColor;
	ctx.textAlign = 'left';
	ctx.fillText(match.player2Name, canvas.width / 2 + 60, y);
	
	ctx.fillStyle = COLORS.SONPI16_ORANGE;
	ctx.font = '40px ' + FONTS.QUENCY_PIXEL;
	ctx.textAlign = 'center';
	ctx.fillText(`${match.lives1} - ${match.lives2}`, canvas.width / 2, y + 40);
}