export const canvasHeight: number = 800
export const canvasWidth: number = canvasHeight
export const paddleSize: number = 100
export const paddleOffset = 30;
export const curveAcceleration = 300;
export const speedBoost = 1.5;
export const defaultLifeCount = 5;

export const BR_PADDLE_LENGTH = 80;
export const BR_PADDLE_WIDTH = 14;
export const BR_PADDLE_SPEED = 400;
export const BR_PADDLE_INWARD_OFFSET = 1.2;
export const BR_CORNER_RADIUS_FACTOR = 0.10;
export const BR_CORNER_RADIUS_MAX = 40;
export const BR_BALL_PUSH_DISTANCE = 30;
export const BR_PADDLE_CURVE_FACTOR = 0.4;
export const BR_BALL_INITIAL_SPEED = 120;
export const CLASSIC_BALL_INITIAL_SPEED = 200;
export const CLASSIC_BALL_RESET_SPEED = 200;

export const BR_PADDLE_LENGTH_BY_PLAYERS: Record<number, number> = {
	3: 180,
	4: 120,
	5: 100,
	6: 90,
	7: 80,
	8: 70,
	9: 65,
	10: 60,
	11: 55,
	12: 50,
	13: 48,
	14: 45,
	15: 43,
	16: 40
};

export const BR_MAX_PLAYERS = 16;

export const FRUIT_FREQUENCY = {
	low: 15000,
	normal: 10000,
	high: 5000
} as const;
