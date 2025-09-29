import { FastifyRequest } from 'fastify';
import { WebSocket } from 'ws';
// import { processPlayerInput } from "../services/gameService";
import { Message, OutgoingMessage } from "../types";

// interface WebSocketConnection {
//   socket: WebSocket;
// }

export function websocketController(socket: WebSocket, log: any) {
  let playerId: string | null = null;

  socket.on("message", (raw) => {
    try {
      const msg: Message = JSON.parse(raw.toString());

      // Player joins (optional if game assigns them)
      if (msg.type === "join") {
        playerId = msg.playerId; // Provided by frontend or assigned earlier
        log.info(`Player joined with id ${playerId}`);
        socket.send(JSON.stringify({ type: "joined", playerId }));
      }

      // Player sends input (up/down/stop/etc.)
      if (msg.type === "input" && playerId) {
        // const updatedState = processPlayerInput(playerId, msg.input);

        const response: OutgoingMessage = {
          type: "state_update",
          state: "test",
        };
        socket.send(JSON.stringify(response));
      }
    } catch (err) {
      log.error(err);
      socket.send(
        JSON.stringify({ type: "error", reason: "Invalid message format" })
      );
    }
  });

  socket.on("close", () => {
    if (playerId) {
      log.info(`Player ${playerId} disconnected`);
      // Later: notify gameService to clean up
    }
  });
}
