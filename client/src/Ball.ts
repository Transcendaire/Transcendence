import { Ball as ServerBall } from "../../server/src/models/Ball.js";

export class Ball extends ServerBall
{
    public render(ctx: CanvasRenderingContext2D, color: string): void
    {
        ctx.fillStyle = color;
        
        const centerX = this.positionX + this.size / 2;
        const centerY = this.positionY + this.size / 2;
        
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
