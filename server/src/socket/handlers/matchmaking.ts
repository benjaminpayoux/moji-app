import type { Server, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  PlayerInfo,
} from "../types.js";
import { roomManager } from "../../matchmaking/room-manager.js";
import { getRandomMovieExcluding } from "../../game/movies.js";

type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type GameServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

function startMultiplayerGame(io: GameServer, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const movie = getRandomMovieExcluding(room.state.usedMovieIds);
  roomManager.prepareNextRound(room.id, movie.id);

  const players: PlayerInfo[] = Array.from(room.players).map((id) => ({
    id,
    score: room.state.scores.get(id) || 0,
  }));

  io.to(room.id).emit("roomState", {
    roomId: room.id,
    players,
    currentMovie: { id: movie.id, emojis: movie.emojis },
    round: room.state.round,
    totalRounds: room.state.totalRounds,
  });
}

export function registerMatchmakingHandlers(io: GameServer, socket: GameSocket) {
  socket.on("joinMatchmaking", () => {
    const result = roomManager.joinQueue(socket.id);

    if (result) {
      for (const playerId of result.players) {
        const playerSocket = io.sockets.sockets.get(playerId);
        playerSocket?.join(result.id);
      }

      const players: PlayerInfo[] = Array.from(result.players).map((id) => ({
        id,
        score: 0,
      }));

      io.to(result.id).emit("matchFound", {
        roomId: result.id,
        players,
      });

      setTimeout(() => {
        startMultiplayerGame(io, result.id);
      }, 1500);
    } else {
      socket.emit("matchmakingStatus", { waiting: true });
    }
  });

  socket.on("leaveMatchmaking", () => {
    roomManager.leaveQueue(socket.id);
    socket.emit("matchmakingStatus", { waiting: false });
  });
}

