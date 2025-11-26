import { Point2D } from '../types.js';

/**
 * @brief Game paddle for player control
 * 
 * Supports both classic rectangular mode and polygon Battle Royale mode.
 * In polygon mode, paddle moves along a side with rotation.
 */
export class Paddle
{
    public positionY: number;
    public positionX: number;
    public dir: boolean;
    public angle: number;
    public sidePosition: number;
    public readonly width: number;
    public readonly height: number;
    public readonly speed: number;
    private sideStart: Point2D | null;
    private sideEnd: Point2D | null;
    private sideLength: number;

    /**
     * @brief Constructor
     * @param positionX Initial X position of the paddle
     * @param positionY Initial Y position of the paddle
     * @param width Paddle width
     * @param height Paddle height
     * @param speed Movement speed
     */
    constructor(
        positionX: number,
        positionY: number,
        width: number = 10,
        height: number = 60,
        speed: number = 400
    )
    {
        this.positionX = positionX;
        this.positionY = positionY;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.dir = false;
        this.angle = 0;
        this.sidePosition = 0.5;
        this.sideStart = null;
        this.sideEnd = null;
        this.sideLength = 0;
    }

    /**
     * @brief Configure paddle for polygon side movement
     * @param start Start point of the side
     * @param end End point of the side
     * @param angle Rotation angle in radians
     */
    public configureSide(start: Point2D, end: Point2D, angle: number): void
    {
        this.sideStart = start;
        this.sideEnd = end;
        this.angle = angle;

        const dx = end.x - start.x;
        const dy = end.y - start.y;

        this.sideLength = Math.sqrt(dx * dx + dy * dy);
        this.sidePosition = 0.5;
        this.updatePositionFromSide();
    }

    private polygonCenter: Point2D | null = null;

    /**
     * @brief Set polygon center for inward normal calculation
     * @param center Center point of the polygon
     */
    public setPolygonCenter(center: Point2D): void
    {
        this.polygonCenter = center;
    }

    /**
     * @brief Update X/Y position based on side position
     */
    private updatePositionFromSide(): void
    {
        if (!this.sideStart || !this.sideEnd)
            return;

        const paddleHalfHeight = this.height / 2;
        const minT = paddleHalfHeight / this.sideLength;
        const maxT = 1 - minT;
        const clampedPosition = Math.max(minT, Math.min(maxT, this.sidePosition));

        const baseX = this.sideStart.x + 
            (this.sideEnd.x - this.sideStart.x) * clampedPosition;
        const baseY = this.sideStart.y + 
            (this.sideEnd.y - this.sideStart.y) * clampedPosition;

        const normalAngle = this.angle + Math.PI / 2;
        let normalX = Math.cos(normalAngle);
        let normalY = Math.sin(normalAngle);

        if (this.polygonCenter)
        {
            const toCenterX = this.polygonCenter.x - baseX;
            const toCenterY = this.polygonCenter.y - baseY;
            const dot = normalX * toCenterX + normalY * toCenterY;
            if (dot < 0)
            {
                normalX = -normalX;
                normalY = -normalY;
            }
        }

        const inwardOffset = this.width * 1.5;
        this.positionX = baseX + normalX * inwardOffset;
        this.positionY = baseY + normalY * inwardOffset;
    }

    /**
     * @brief Check if paddle is in polygon mode
     * @returns True if configured for polygon side
     */
    public isPolygonMode(): boolean
    {
        return this.sideStart !== null && this.sideEnd !== null;
    }

    /**
     * @brief Reset paddle to classic rectangle mode
     */
    public resetToClassicMode(): void
    {
        this.sideStart = null;
        this.sideEnd = null;
        this.sideLength = 0;
        this.sidePosition = 0.5;
        this.angle = 0;
    }

    /**
     * @brief Move paddle upward with bounds checking
     * @param deltaTime Time elapsed since last update in milliseconds
     * @param canvasHeight Height of the game canvas
     */
    public moveUp(deltaTime: number, canvasHeight: number): void
    {
        this.dir = true;
        if (this.isPolygonMode())
        {
            this.moveAlongSide(-deltaTime);
            return;
        }
        this.positionY = Math.max(0, this.positionY - this.speed * (deltaTime / 1000));
    }

    /**
     * @brief Move paddle downward with bounds checking
     * @param deltaTime Time elapsed since last update in milliseconds
     * @param canvasHeight Height of the game canvas
     */
    public moveDown(deltaTime: number, canvasHeight: number): void
    {
        this.dir = false;
        if (this.isPolygonMode())
        {
            this.moveAlongSide(deltaTime);
            return;
        }
        this.positionY = Math.min(
            canvasHeight - this.height,
            this.positionY + this.speed * (deltaTime / 1000)
        );
    }

    /**
     * @brief Move paddle along its assigned side
     * @param deltaTime Time elapsed (positive = toward end, negative = toward start)
     */
    private moveAlongSide(deltaTime: number): void
    {
        if (this.sideLength === 0)
            return;

        const movement = (this.speed * (deltaTime / 1000)) / this.sideLength;
        const paddleHalfHeight = this.height / 2;
        const minT = paddleHalfHeight / this.sideLength;
        const maxT = 1 - minT;

        this.sidePosition = Math.max(minT, Math.min(maxT, this.sidePosition + movement));
        this.updatePositionFromSide();
    }

    /**
     * @brief Get paddle center position
     * @returns Center point of the paddle
     */
    public getCenter(): Point2D
    {
        if (this.isPolygonMode())
            return { x: this.positionX, y: this.positionY };
        return {
            x: this.positionX + this.width / 2,
            y: this.positionY + this.height / 2
        };
    }

    /**
     * @brief Get paddle corners for collision detection in polygon mode
     * @returns Array of 4 corner points
     * @details height = length along the side, width = thickness perpendicular to side
     */
    public getCorners(): Point2D[]
    {
        const center = this.getCenter();
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        // halfLength along the side angle, halfWidth perpendicular
        const halfLength = this.height / 2;  // 30px along side
        const halfWidth = this.width / 2;    // 5px perpendicular

        // Corners: along angle = (cos, sin) * halfLength, perpendicular = (-sin, cos) * halfWidth
        return [
            {
                x: center.x - cos * halfLength - sin * halfWidth,
                y: center.y - sin * halfLength + cos * halfWidth
            },
            {
                x: center.x + cos * halfLength - sin * halfWidth,
                y: center.y + sin * halfLength + cos * halfWidth
            },
            {
                x: center.x + cos * halfLength + sin * halfWidth,
                y: center.y + sin * halfLength - cos * halfWidth
            },
            {
                x: center.x - cos * halfLength + sin * halfWidth,
                y: center.y - sin * halfLength - cos * halfWidth
            }
        ];
    }
}