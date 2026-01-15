import type { Server } from "socket.io";
import { randomUUID } from "crypto";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./types.js";
import { registerGameHandlers } from "./handlers/game.js";

type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export function initializeSocketHandlers(io: GameServer) {
  io.on("connection", (socket) => {
    socket.data.sessionId = randomUUID();

    registerGameHandlers(io, socket);

    socket.on("disconnect", () => {
      // Session cleanup if needed
    });
  });
}
