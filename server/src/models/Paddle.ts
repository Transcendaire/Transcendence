export class Paddle
{
    public positionY: number;
    public dir: boolean;
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
        this.dir = false;
    }



    public moveUp(deltaTime: number, canvasHeight: number): void
    {
        this.positionY = Math.max(0, this.positionY - this.speed * (deltaTime / 1000));
        this.dir = true;
    }

    public moveDown(deltaTime: number, canvasHeight: number): void
    {
        this.positionY = Math.min(canvasHeight - this.height, this.positionY + this.speed * (deltaTime / 1000));
        this.dir = false;
    }
}
