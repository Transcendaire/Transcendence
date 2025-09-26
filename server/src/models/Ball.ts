export class Ball
{
    public positionX: number;
    public positionY: number;
    public velocityX: number;
    public velocityY: number;
    public rotation: number;
    public readonly size: number;
    public readonly speedIncrement: number;


    public ballStart(start: boolean)
    {
        const randomY = Math.random();
        this.velocityY = (randomY - 0.5) * 500;
        if (start)
        {
            const randomX = Math.random();
            if (randomX > 0.5)
                this.velocityX = -this.velocityX;
        }
    }

    constructor(positionX: number, positionY: number, velocityX: number = 200)
    {
        this.positionX = positionX;
        this.positionY = positionY;
        this.velocityX = velocityX;
        this.velocityY = 0;
        this.rotation = 0;
        this.size = 12;
        this.speedIncrement = 1.1;
        this.ballStart(true);
    }



    public update(deltaTime: number): void
    {
        const dt = deltaTime / 1000;
        
        this.positionX += this.velocityX * dt;
        this.positionY += this.velocityY * dt;
        
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        this.rotation += speed * dt * 0.01;
    }

    public bounceVertical(): void
    {
        this.velocityY = -this.velocityY;
    }

    public bounceHorizontal(): void
    {
        this.velocityX = -this.velocityX * this.speedIncrement;
    }

    public reset(canvasWidth: number, canvasHeight: number): void
    {
        this.positionX = canvasWidth / 2;
        this.positionY = canvasHeight / 2;
        this.velocityX = this.velocityX > 0 ? -200 : 200;
        this.ballStart(false);
    }
}
