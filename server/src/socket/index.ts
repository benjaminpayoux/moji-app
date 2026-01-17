import type { Server } from "socket.io";
import { randomUUID } from "crypto";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  PlayerInfo,
  RoomState,
} from "./types.js";
import { registerGameHandlers } from "./handlers/game.js";
import { registerMatchmakingHandlers } from "./handlers/matchmaking.js";
import { registerMultiplayerHandlers } from "./handlers/multiplayer.js";
import { roomManager } from "../matchmaking/room-manager.js";
import { getMovieById } from "../game/movies.js";

type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

function buildRoomState(roomId: string, playerId: string): RoomState | null {
  const room = roomManager.getRoom(roomId);
  if (!room) return null;

  const players: PlayerInfo[] = [];
  for (const [id, conn] of room.players) {
    players.push({
      id,
      score: room.state.scores.get(id) || 0,
    });
  }

  const movie = room.state.currentMovieId > 0 ? getMovieById(room.state.currentMovieId) : null;

  return {
    roomId: room.id,
    players,
    currentMovie: movie ? { id: movie.id, emojis: movie.emojis } : null,
    round: room.state.round,
    totalRounds: room.state.totalRounds,
  };
}

export function initializeSocketHandlers(io: GameServer) {
  io.on("connection", (socket) => {
    socket.data.sessionId = randomUUID();

    registerGameHandlers(io, socket);
    registerMatchmakingHandlers(io, socket);
    registerMultiplayerHandlers(io, socket);

    socket.on("registerPlayer", ({ playerId }) => {
      console.log(`[registerPlayer] socketId=${socket.id}, playerId=${playerId}`);
      socket.data.playerId = playerId;
      roomManager.registerSocket(socket.id, playerId);
    });

    socket.on("attemptReconnect", ({ playerId, roomId }) => {
      const result = roomManager.attemptReconnect(playerId, roomId, socket.id);

      if (!result.success) {
        socket.emit("reconnectFailed", { reason: result.reason });
        return;
      }

      socket.data.playerId = playerId;
      socket.join(roomId);

      const roomState = buildRoomState(roomId, playerId);
      if (!roomState) {
        socket.emit("reconnectFailed", { reason: "room_closed" });
        return;
      }

      const opponentConnected = result.opponent?.socketId !== null && !result.opponent?.intentionalLeave;
      const roundEndTime = roomManager.getRoundEndTime(roomId);

      socket.emit("reconnectSuccess", {
        roomState,
        opponentConnected: opponentConnected || false,
        roundEndTime,
      });

      if (result.opponent?.socketId) {
        io.to(result.opponent.socketId).emit("opponentReconnected");
      }
    });

    socket.on("intentionalLeave", ({ roomId }) => {
      const playerId = socket.data.playerId;
      if (!playerId) return;

      const result = roomManager.handleIntentionalLeave(playerId);
      if (!result) return;

      socket.leave(roomId);

      if (result.opponent?.socketId) {
        io.to(result.opponent.socketId).emit("opponentLeftPermanently");
      }
    });

    socket.on("disconnect", () => {
      const playerId = socket.data.playerId;

      if (playerId) {
        roomManager.leaveQueue(playerId);
      }

      const result = roomManager.handleDisconnect(socket.id, (timedOutPlayerId, timedOutRoomId) => {
        const timeoutResult = roomManager.handleReconnectTimeout(timedOutPlayerId, timedOutRoomId);
        if (timeoutResult?.opponent?.socketId) {
          io.to(timeoutResult.opponent.socketId).emit("opponentLeftPermanently");
        }
      });

      if (result && result.opponent?.socketId) {
        io.to(result.opponent.socketId).emit("opponentDisconnected", {
          reconnectTimeoutSeconds: roomManager.getReconnectTimeoutSeconds(),
        });
      }
    });
  });
}
