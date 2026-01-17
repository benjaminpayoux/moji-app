import type { Server } from "socket.io";
import { randomUUID } from "crypto";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./types.js";
import { registerGameHandlers } from "./handlers/game.js";
import { registerMatchmakingHandlers } from "./handlers/matchmaking.js";
import { registerMultiplayerHandlers } from "./handlers/multiplayer.js";
import { roomManager } from "../matchmaking/room-manager.js";

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
    registerMatchmakingHandlers(io, socket);
    registerMultiplayerHandlers(io, socket);

    socket.on("disconnect", () => {
      roomManager.leaveQueue(socket.id);

      const result = roomManager.removePlayer(socket.id);
      if (result && !result.wasLastPlayer) {
        io.to(result.room.id).emit("opponentLeft");
      }
    });
  });
}
