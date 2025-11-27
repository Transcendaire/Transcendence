export const canvasHeight: number = 800
export const canvasWidth: number = canvasHeight
export const paddleSize: number = 100
export const paddleOffset = 30;
export const curveAcceleration = 300;
export const speedBoost = 1.5;
export const defaultLifeCount = 5;

export const BR_PADDLE_LENGTH = 80;
export const BR_PADDLE_WIDTH = 12;
export const BR_PADDLE_SPEED = 400;
export const BR_PADDLE_INWARD_OFFSET = 1.5;
export const BR_CORNER_RADIUS_FACTOR = 0.10;
export const BR_CORNER_RADIUS_MAX = 40;
export const BR_BALL_PUSH_DISTANCE = 8;
export const BR_PADDLE_CURVE_FACTOR = 0.4;

export const GEOMETRY_CONFIG = {
	2: { shape: 'rectangle', radius: 400 },
	3: { shape: 'triangle', radius: 380 },
	4: { shape: 'square', radius: 400 },
	5: { shape: 'pentagon', radius: 380 },
	6: { shape: 'hexagon', radius: 400 }
} as const;

export const FRUIT_FREQUENCY = {
	low: 15000,
	normal: 10000,
	high: 5000
} as const;
