import { Paddle as ServerPaddle } from "../../server/src/models/Paddle.js";

export class Paddle extends ServerPaddle
{
    public render(ctx: CanvasRenderingContext2D, color: string): void
    {
        ctx.fillStyle = color;
        
        const x = Math.floor(this.positionX);
        const y = Math.floor(this.positionY);
        
        ctx.fillRect(x, y, 10, this.height);
        ctx.fillRect(x + 2, y-4 , 6, this.height+8);
    }
}
