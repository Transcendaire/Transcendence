import { Ball as SharedBall } from "../../shared/models/Ball.js";

/**
 * @brief Client-side ball rendering extension
 */
export class Ball extends SharedBall
{
    /**
     * @brief Render ball on canvas with rotation
     * @param ctx Canvas rendering context
     * @param color Ball color
     */
    public render(ctx: CanvasRenderingContext2D, color: string): void
    {
        const centerX = this.positionX + this.size / 2;
        const centerY = this.positionY + this.size / 2;
        
        ctx.fillStyle = color;
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        ctx.translate(-this.size / 2, -this.size / 2);
        ctx.fillRect(3, 0, 6, 3);
        ctx.fillRect(0, 3, 12, 3);
        ctx.fillRect(0, 6, 12, 3);
        ctx.fillRect(3, 9, 6, 3);
        ctx.restore();
    }
}
