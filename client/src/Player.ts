import { Player as ServerPlayer } from "../../server/src/models/Player.js";
import { Paddle } from "./Paddle.js";

export class Player extends ServerPlayer
{
    public override paddle: Paddle;

    constructor(name: string, paddleX: number, paddleY: number)
    {
        super(name, paddleX, paddleY);
        this.paddle = new Paddle(paddleX, paddleY);
    }
}
