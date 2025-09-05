import { Paddle } from "./Paddle.js";

export class Player
{
    public score: number;
    public paddle: Paddle;
    public readonly name: string;

    constructor(name: string, paddleX: number, paddleY: number)
    {
        this.name = name;
        this.score = 0;
        this.paddle = new Paddle(paddleX, paddleY);
    }

    public incrementScore(): void
    {
        this.score++;
    }

    public resetScore(): void
    {
        this.score = 0;
    }
}
