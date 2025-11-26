import { Point2D, PolygonData, SideData } from "/dist/shared/types.js";
import { COLORS } from "../../components/consts.js";

/**
 * @brief Calculate polygon vertices for N-sided polygon
 * @param centerX Center X coordinate
 * @param centerY Center Y coordinate
 * @param radius Polygon radius
 * @param sides Number of sides
 * @returns Array of vertex points
 */
export function getPolygonVertices(
	centerX: number,
	centerY: number,
	radius: number,
	sides: number
): Point2D[]
{
	const vertices: Point2D[] = [];
	const angleOffset = -Math.PI / 2;
	for (let i = 0; i < sides; i++)
	{
		const angle = angleOffset + (2 * Math.PI * i) / sides;
		vertices.push({
			x: centerX + radius * Math.cos(angle),
			y: centerY + radius * Math.sin(angle)
		});
	}
	return vertices;
}

/**
 * @brief Get side data from vertices
 * @param vertices Array of polygon vertices
 * @param sideIndex Index of the side
 * @returns SideData object with start, end, center, angle, length
 */
export function getSideData(vertices: Point2D[], sideIndex: number): SideData
{
	const start = vertices[sideIndex]!;
	const end = vertices[(sideIndex + 1) % vertices.length]!;
	const center: Point2D = {
		x: (start.x + end.x) / 2,
		y: (start.y + end.y) / 2
	};
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const angle = Math.atan2(dy, dx);
	const length = Math.sqrt(dx * dx + dy * dy);
	return { start, end, center, angle, length };
}

/**
 * @brief Draw polygon arena outline
 * @param ctx Canvas rendering context
 * @param vertices Polygon vertices
 * @param activeSides Array of active side indices (non-eliminated players)
 */
export function drawPolygonArena(
	ctx: CanvasRenderingContext2D,
	vertices: Point2D[],
	activeSides: number[]
): void
{
	ctx.strokeStyle = COLORS.SONPI16_ORANGE;
	ctx.lineWidth = 3;
	ctx.beginPath();
	for (let i = 0; i < vertices.length; i++)
	{
		const start = vertices[i]!;
		const end = vertices[(i + 1) % vertices.length]!;
		const isActive = activeSides.includes(i);
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		if (!isActive)
		{
			ctx.save();
			ctx.setLineDash([10, 10]);
			ctx.strokeStyle = COLORS.SONPI16_ORANGE + "80";
			ctx.stroke();
			ctx.restore();
			ctx.beginPath();
		}
	}
	ctx.stroke();
}

/**
 * @brief Draw corner zones (rebounding areas)
 * @param ctx Canvas rendering context
 * @param vertices Polygon vertices
 * @param cornerRadius Size of corner zone
 */
export function drawCornerZones(
	ctx: CanvasRenderingContext2D,
	vertices: Point2D[],
	cornerRadius: number = 20
): void
{
	ctx.fillStyle = COLORS.SONPI16_ORANGE + "40";
	for (const vertex of vertices)
	{
		ctx.beginPath();
		ctx.arc(vertex.x, vertex.y, cornerRadius, 0, Math.PI * 2);
		ctx.fill();
	}
}

/**
 * @brief Calculate paddle corners for rotated paddle
 * @param centerX Paddle center X
 * @param centerY Paddle center Y
 * @param width Paddle width (thickness perpendicular to side)
 * @param height Paddle height (length along side)
 * @param angle Paddle rotation angle
 * @returns Array of 4 corner points
 */
export function getPaddleCorners(
	centerX: number,
	centerY: number,
	width: number,
	height: number,
	angle: number
): Point2D[]
{
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const halfLength = height / 2;
	const halfWidth = width / 2;

	return [
		{
			x: centerX - cos * halfLength - sin * halfWidth,
			y: centerY - sin * halfLength + cos * halfWidth
		},
		{
			x: centerX + cos * halfLength - sin * halfWidth,
			y: centerY + sin * halfLength + cos * halfWidth
		},
		{
			x: centerX + cos * halfLength + sin * halfWidth,
			y: centerY + sin * halfLength - cos * halfWidth
		},
		{
			x: centerX - cos * halfLength + sin * halfWidth,
			y: centerY - sin * halfLength - cos * halfWidth
		}
	];
}

/**
 * @brief Calculate paddle position on side from sidePosition (0-1)
 * @param side SideData of the side
 * @param sidePosition Position along side (0-1)
 * @param paddleLength Length of paddle
 * @param paddleWidth Width of paddle (for inward offset)
 * @param polygonCenter Center of polygon for inward direction check
 * @returns Center position of paddle
 */
export function getPaddlePositionOnSide(
	side: SideData,
	sidePosition: number,
	paddleLength: number,
	paddleWidth: number = 10,
	polygonCenter?: Point2D
): Point2D
{
	const margin = paddleLength / 2;
	const usableLength = side.length - paddleLength;
	const t = margin / side.length + (sidePosition * usableLength) / side.length;
	const baseX = side.start.x + (side.end.x - side.start.x) * t;
	const baseY = side.start.y + (side.end.y - side.start.y) * t;

	const normalAngle = side.angle + Math.PI / 2;
	let normalX = Math.cos(normalAngle);
	let normalY = Math.sin(normalAngle);
	if (polygonCenter)
	{
		const toCenterX = polygonCenter.x - baseX;
		const toCenterY = polygonCenter.y - baseY;
		const dot = normalX * toCenterX + normalY * toCenterY;
		if (dot < 0)
		{
			normalX = -normalX;
			normalY = -normalY;
		}
	}

	const inwardOffset = paddleWidth * 1.5;
	return {
		x: baseX + normalX * inwardOffset,
		y: baseY + normalY * inwardOffset
	};
}

/**
 * @brief Get offset position for UI elements along a side
 * @param side SideData of the side
 * @param offset Distance from side center (positive = outward)
 * @returns Position point offset from side center
 */
export function getUIPositionForSide(side: SideData, offset: number): Point2D
{
	const normalAngle = side.angle + Math.PI / 2;
	return {
		x: side.center.x + Math.cos(normalAngle) * offset,
		y: side.center.y + Math.sin(normalAngle) * offset
	};
}

/**
 * @brief Calculate rotation angle for UI elements on a side
 * @param sideIndex Index of the side
 * @param totalSides Total number of sides
 * @returns Rotation angle in radians
 */
export function getUIRotationForSide(sideIndex: number, totalSides: number): number
{
	return (2 * Math.PI * sideIndex) / totalSides - Math.PI / 2;
}
