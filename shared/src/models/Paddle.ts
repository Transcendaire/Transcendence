/**
 * @brief Game paddle for player control
 */
export class Paddle
{
    public positionY: number;
    public dir: boolean;
    public readonly positionX: number;
    public readonly width: number;
    public readonly height: number;
    public readonly speed: number;

    /**
     * @brief Constructor
     * @param positionX Fixed X position of the paddle
     * @param positionY Initial Y position of the paddle
     * @param width Paddle width
     * @param height Paddle height
     * @param speed Movement speed
     */
    constructor(positionX: number, positionY: number, width: number = 10, height: number = 100, speed: number = 400)
    {
        this.positionX = positionX;
        this.positionY = positionY;
        this.width = width;
        this.height = height;
        this.speed = speed;
        this.dir = false;
    }



    /**
     * @brief Move paddle upward with bounds checking
     * @param deltaTime Time elapsed since last update in milliseconds
     * @param canvasHeight Height of the game canvas
     */
    public moveUp(deltaTime: number, canvasHeight: number): void
    {
        this.positionY = Math.max(0, this.positionY - this.speed * (deltaTime / 1000));
        this.dir = true;
    }

    /**
     * @brief Move paddle downward with bounds checking
     * @param deltaTime Time elapsed since last update in milliseconds
     * @param canvasHeight Height of the game canvas
     */
    public moveDown(deltaTime: number, canvasHeight: number): void
    {
        this.positionY = Math.min(canvasHeight - this.height, this.positionY + this.speed * (deltaTime / 1000));
        this.dir = false;
    }

    public render(ctx: CanvasRenderingContext2D, color: string): void
    {
        const x = Math.floor(this.positionX);
        const y = Math.floor(this.positionY);
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 10, this.height);
        ctx.fillRect(x + 2, y-4 , 6, this.height+8);
    }
}
