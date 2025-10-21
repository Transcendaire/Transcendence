import { Paddle as SharedPaddle } from "../../shared/models/Paddle.js";

/**
 * @brief Client-side paddle rendering extension
 */
export class Paddle extends SharedPaddle
{
    /**
     * @brief Render paddle on canvas
     * @param ctx Canvas rendering context
     * @param color Paddle color
     */
    public render(ctx: CanvasRenderingContext2D, color: string): void
    {
        const x = Math.floor(this.positionX);
        const y = Math.floor(this.positionY);
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 10, this.height);
        ctx.fillRect(x + 2, y-4 , 6, this.height+8);
    }
}
