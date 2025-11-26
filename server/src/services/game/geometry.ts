import { Point2D, PolygonData, SideData } from '@app/shared/types.js';

/**
 * @brief Geometry manager for polygon-based game arenas
 * 
 * Provides calculations for N-sided polygon arenas used in Battle Royale mode.
 * Handles vertex positions, side centers, angles, and collision zones.
 */
export class GeometryManager
{
	private readonly centerX: number;
	private readonly centerY: number;
	private readonly radius: number;

	/**
	 * @brief Constructor
	 * @param centerX X coordinate of polygon center
	 * @param centerY Y coordinate of polygon center
	 * @param radius Distance from center to vertices
	 */
	constructor(centerX: number, centerY: number, radius: number)
	{
		this.centerX = centerX;
		this.centerY = centerY;
		this.radius = radius;
	}

	/**
	 * @brief Get vertices of a regular polygon
	 * @param playerCount Number of sides (players)
	 * @returns Array of vertex points
	 */
	public getVertices(playerCount: number): Point2D[]
	{
		const vertices: Point2D[] = [];
		const angleOffset = -Math.PI / 2;

		for (let i = 0; i < playerCount; i++)
		{
			const angle = angleOffset + (2 * Math.PI * i) / playerCount;
			vertices.push({
				x: this.centerX + this.radius * Math.cos(angle),
				y: this.centerY + this.radius * Math.sin(angle)
			});
		}
		return vertices;
	}

	/**
	 * @brief Get center point of a polygon side
	 * @param playerCount Number of sides (players)
	 * @param sideIndex Index of the side (0-based)
	 * @returns Center point of the side
	 */
	public getSideCenter(playerCount: number, sideIndex: number): Point2D
	{
		const vertices = this.getVertices(playerCount);
		const v1 = vertices[sideIndex]!;
		const v2 = vertices[(sideIndex + 1) % playerCount]!;

		return {
			x: (v1.x + v2.x) / 2,
			y: (v1.y + v2.y) / 2
		};
	}

	/**
	 * @brief Get angle of a polygon side (for paddle rotation)
	 * @param playerCount Number of sides (players)
	 * @param sideIndex Index of the side (0-based)
	 * @returns Angle in radians
	 */
	public getSideAngle(playerCount: number, sideIndex: number): number
	{
		const vertices = this.getVertices(playerCount);
		const v1 = vertices[sideIndex]!;
		const v2 = vertices[(sideIndex + 1) % playerCount]!;

		return Math.atan2(v2.y - v1.y, v2.x - v1.x);
	}

	/**
	 * @brief Get length of a polygon side
	 * @param playerCount Number of sides (players)
	 * @returns Side length
	 */
	public getSideLength(playerCount: number): number
	{
		return 2 * this.radius * Math.sin(Math.PI / playerCount);
	}

	/**
	 * @brief Get full side data for a player
	 * @param playerCount Number of sides (players)
	 * @param sideIndex Index of the side (0-based)
	 * @returns Side data including vertices, center, angle, and length
	 */
	public getSideData(playerCount: number, sideIndex: number): SideData
	{
		const vertices = this.getVertices(playerCount);
		const v1 = vertices[sideIndex]!;
		const v2 = vertices[(sideIndex + 1) % playerCount]!;

		return {
			start: v1,
			end: v2,
			center: this.getSideCenter(playerCount, sideIndex),
			angle: this.getSideAngle(playerCount, sideIndex),
			length: this.getSideLength(playerCount)
		};
	}

	/**
	 * @brief Get all polygon data
	 * @param playerCount Number of sides (players)
	 * @returns Complete polygon data
	 */
	public getPolygonData(playerCount: number): PolygonData
	{
		const vertices = this.getVertices(playerCount);
		const sides: SideData[] = [];

		for (let i = 0; i < playerCount; i++)
			sides.push(this.getSideData(playerCount, i));
		return {
			vertices,
			sides,
			center: { x: this.centerX, y: this.centerY },
			radius: this.radius,
			cornerRadius: this.getCornerZoneRadius(playerCount)
		};
	}

	/**
	 * @brief Check if a point is inside the polygon
	 * @param point Point to check
	 * @param playerCount Number of sides (players)
	 * @returns True if point is inside polygon
	 */
	public isPointInside(point: Point2D, playerCount: number): boolean
	{
		const vertices = this.getVertices(playerCount);
		let inside = false;

		for (let i = 0, j = playerCount - 1; i < playerCount; j = i++)
		{
			const vi = vertices[i]!;
			const vj = vertices[j]!;
			const intersects = ((vi.y > point.y) !== (vj.y > point.y)) &&
				(point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x);
			if (intersects)
				inside = !inside;
		}
		return inside;
	}

	/**
	 * @brief Get corner zone radius (for rebounding)
	 * @param playerCount Number of sides (players)
	 * @returns Corner zone radius
	 */
	public getCornerZoneRadius(playerCount: number): number
	{
		return this.getSideLength(playerCount) * 0.15;
	}

	/**
	 * @brief Check if a point is in a corner zone
	 * @param point Point to check
	 * @param playerCount Number of sides (players)
	 * @returns Index of corner (-1 if not in corner)
	 */
	public getCornerIndex(point: Point2D, playerCount: number): number
	{
		const vertices = this.getVertices(playerCount);
		const cornerRadius = this.getCornerZoneRadius(playerCount);

		for (let i = 0; i < vertices.length; i++)
		{
			const vertex = vertices[i]!;
			const dx = point.x - vertex.x;
			const dy = point.y - vertex.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			if (distance <= cornerRadius)
				return i;
		}
		return -1;
	}

	/**
	 * @brief Get distance from point to a line segment
	 * @param point Point to check
	 * @param lineStart Start of line segment
	 * @param lineEnd End of line segment
	 * @returns Distance to line segment
	 */
	public distanceToSegment(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number
	{
		const dx = lineEnd.x - lineStart.x;
		const dy = lineEnd.y - lineStart.y;
		const lengthSquared = dx * dx + dy * dy;

		if (lengthSquared === 0)
			return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);

		let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
		t = Math.max(0, Math.min(1, t));

		const closestX = lineStart.x + t * dx;
		const closestY = lineStart.y + t * dy;

		return Math.sqrt((point.x - closestX) ** 2 + (point.y - closestY) ** 2);
	}

	/**
	 * @brief Get distance a point is outside the polygon on a specific side
	 * @param point Point to check
	 * @param playerCount Number of sides
	 * @param sideIndex Index of the side
	 * @returns Distance outside (0 if inside)
	 */
	public getDistanceOutside(point: Point2D, playerCount: number, sideIndex: number): number
	{
		const normal = this.getSideNormal(playerCount, sideIndex);
		const sideCenter = this.getSideCenter(playerCount, sideIndex);

		const toPoint = {
			x: point.x - sideCenter.x,
			y: point.y - sideCenter.y
		};

		const projOnNormal = toPoint.x * normal.x + toPoint.y * normal.y;

		return projOnNormal < 0 ? -projOnNormal : 0;
	}

	/**
	 * @brief Get which side a point is closest to (excluding corners)
	 * @param point Point to check
	 * @param playerCount Number of sides (players)
	 * @returns Side index or -1 if in corner
	 */
	public getClosestSide(point: Point2D, playerCount: number): number
	{
		if (this.getCornerIndex(point, playerCount) >= 0)
			return -1;

		const vertices = this.getVertices(playerCount);
		let minDistance = Infinity;
		let closestSide = 0;

		for (let i = 0; i < playerCount; i++)
		{
			const v1 = vertices[i]!;
			const v2 = vertices[(i + 1) % playerCount]!;
			const distance = this.distanceToSegment(point, v1, v2);
			if (distance < minDistance)
			{
				minDistance = distance;
				closestSide = i;
			}
		}
		return closestSide;
	}

	/**
	 * @brief Get normal vector for a side (pointing inward)
	 * @param playerCount Number of sides (players)
	 * @param sideIndex Index of the side
	 * @returns Normal vector
	 */
	public getSideNormal(playerCount: number, sideIndex: number): Point2D
	{
		const angle = this.getSideAngle(playerCount, sideIndex);
		const normalAngle = angle + Math.PI / 2;

		const normal = {
			x: Math.cos(normalAngle),
			y: Math.sin(normalAngle)
		};

		const sideCenter = this.getSideCenter(playerCount, sideIndex);
		const toCenter = {
			x: this.centerX - sideCenter.x,
			y: this.centerY - sideCenter.y
		};

		const dot = normal.x * toCenter.x + normal.y * toCenter.y;
		if (dot < 0)
		{
			normal.x = -normal.x;
			normal.y = -normal.y;
		}
		return normal;
	}

	/**
	 * @brief Reflect velocity vector off a side
	 * @param velocity Current velocity
	 * @param playerCount Number of sides (players)
	 * @param sideIndex Index of the side to bounce off
	 * @returns Reflected velocity
	 */
	public reflectOffSide(velocity: Point2D, playerCount: number, sideIndex: number): Point2D
	{
		const normal = this.getSideNormal(playerCount, sideIndex);
		const dot = velocity.x * normal.x + velocity.y * normal.y;

		return {
			x: velocity.x - 2 * dot * normal.x,
			y: velocity.y - 2 * dot * normal.y
		};
	}

	/**
	 * @brief Reflect velocity off a corner circle (like bouncing off a pillar)
	 * @param velocity Current velocity
	 * @param playerCount Number of sides (players)
	 * @param cornerIndex Index of the corner
	 * @param ballCenter Center of the ball
	 * @returns Reflected velocity
	 */
	public reflectOffCorner(
		velocity: Point2D,
		playerCount: number,
		cornerIndex: number,
		ballCenter: Point2D
	): Point2D
	{
		const vertices = this.getVertices(playerCount);
		const vertex = vertices[cornerIndex]!;

		const dx = ballCenter.x - vertex.x;
		const dy = ballCenter.y - vertex.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist === 0)
			return { x: -velocity.x, y: -velocity.y };

		const normal = { x: dx / dist, y: dy / dist };
		const dot = velocity.x * normal.x + velocity.y * normal.y;

		return {
			x: velocity.x - 2 * dot * normal.x,
			y: velocity.y - 2 * dot * normal.y
		};
	}

	/**
	 * @brief Check collision with corner circle
	 * @param ballCenter Center of the ball
	 * @param ballRadius Radius of the ball
	 * @param playerCount Number of sides (players)
	 * @returns Index of corner hit (-1 if no collision)
	 */
	public checkCornerCollision(
		ballCenter: Point2D,
		ballRadius: number,
		playerCount: number
	): number
	{
		const vertices = this.getVertices(playerCount);
		const cornerRadius = this.getCornerZoneRadius(playerCount);

		for (let i = 0; i < vertices.length; i++)
		{
			const vertex = vertices[i]!;
			const dx = ballCenter.x - vertex.x;
			const dy = ballCenter.y - vertex.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance <= cornerRadius + ballRadius)
				return i;
		}
		return -1;
	}

	/**
	 * @brief Get vertex position by index
	 * @param playerCount Number of sides
	 * @param cornerIndex Index of corner
	 * @returns Vertex position
	 */
	public getVertex(playerCount: number, cornerIndex: number): Point2D
	{
		return this.getVertices(playerCount)[cornerIndex]!;
	}
}

/**
 * @brief Check if point is inside quadrilateral using cross product
 * @param point Point to check
 * @param quad Four corners of quadrilateral
 * @returns True if inside
 */
export function isPointInQuad(point: Point2D, quad: Point2D[]): boolean
{
	let inside = true;

	for (let i = 0; i < 4; i++)
	{
		const p1 = quad[i]!;
		const p2 = quad[(i + 1) % 4]!;
		const cross = (p2.x - p1.x) * (point.y - p1.y) -
			(p2.y - p1.y) * (point.x - p1.x);
		if (cross < 0)
			inside = false;
	}
	return inside;
}
