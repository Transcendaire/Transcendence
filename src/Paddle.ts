export class Paddle
{
    public positionY: number;
    public readonly positionX: number;
    public readonly width: number;
    public readonly height: number;
    public readonly speed: number;

    constructor(positionX: number, positionY: number, width: number = 10, height: number = 100, speed: number = 400)
    {
        this.positionX = positionX;
        this.positionY = positionY;
        this.width = width;
        this.height = height;
        this.speed = speed;
    }

    public render(ctx: CanvasRenderingContext2D, color: string): void
    {
        ctx.fillStyle = color;
        
        const x = Math.floor(this.positionX);
        const y = Math.floor(this.positionY);
        
        ctx.fillRect(x, y, 10, this.height);
        ctx.fillRect(x + 2, y-4 , 6, this.height+8);
    }

    public moveUp(deltaTime: number, canvasHeight: number): void
    {
        this.positionY = Math.max(0, this.positionY - this.speed * (deltaTime / 1000));
    }

    public moveDown(deltaTime: number, canvasHeight: number): void
    {
        this.positionY = Math.min(canvasHeight - this.height, this.positionY + this.speed * (deltaTime / 1000));
    }
}
