import type { Server, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  PlayerInfo,
} from "../types.js";
import { roomManager } from "../../matchmaking/room-manager.js";
import { getRandomMovieExcluding, getMovieById } from "../../game/movies.js";

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

function handleRoundTimeout(io: GameServer, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room || room.state.roundAnswered) return;

  roomManager.markRoundAnswered(roomId);
  roomManager.clearAllTimers(roomId);

  const movie = getMovieById(room.state.currentMovieId);

  io.to(roomId).emit("roundTimeout", {
    correctAnswer: movie?.answers[0] || "",
    scores: roomManager.getScores(roomId),
  });

  io.to(roomId).emit("roundResult", {
    winnerId: null,
    correctAnswer: movie?.answers[0] || "",
    scores: roomManager.getScores(roomId),
  });

  if (roomManager.isGameOver(roomId)) {
    setTimeout(() => endGame(io, roomId), 2500);
  } else {
    setTimeout(() => nextRound(io, roomId), 2500);
  }
}

function nextRound(io: GameServer, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const movie = getRandomMovieExcluding(room.state.usedMovieIds);
  const hasMoreRounds = roomManager.prepareNextRound(roomId, movie.id);

  if (!hasMoreRounds) {
    endGame(io, roomId);
    return;
  }

  const timerData = roomManager.startRoundTimer(roomId, () => {
    handleRoundTimeout(io, roomId);
  });

  if (!timerData) return;

  roomManager.startTimeSync(roomId, (remainingMs) => {
    io.to(roomId).emit("timeSync", { remainingMs });
  });

  const players: PlayerInfo[] = [];
  for (const [id] of room.players) {
    players.push({
      id,
      score: room.state.scores.get(id) || 0,
    });
  }

  io.to(roomId).emit("roomState", {
    roomId: room.id,
    players,
    currentMovie: { id: movie.id, emojis: movie.emojis },
    round: room.state.round,
    totalRounds: room.state.totalRounds,
  });

  io.to(roomId).emit("roundStart", {
    movie: { id: movie.id, emojis: movie.emojis },
    round: room.state.round,
    totalRounds: room.state.totalRounds,
    endTime: timerData.endTime,
    durationMs: timerData.durationMs,
  });
}

function endGame(io: GameServer, roomId: string) {
  const scores = roomManager.getScores(roomId);
  const entries = Object.entries(scores);

  let winnerId: string | null = null;
  if (entries.length > 0) {
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    if (sorted.length >= 2 && sorted[0][1] !== sorted[1][1]) {
      winnerId = sorted[0][0];
    }
  }

  io.to(roomId).emit("gameEnd", {
    winnerId,
    finalScores: scores,
  });

  setTimeout(() => {
    const room = roomManager.getRoom(roomId);
    if (room) {
      for (const [, conn] of room.players) {
        if (conn.socketId) {
          const socket = io.sockets.sockets.get(conn.socketId);
          socket?.leave(roomId);
        }
      }
      roomManager.deleteRoom(roomId);
    }
  }, 5000);
}

function startMultiplayerGame(io: GameServer, roomId: string) {
  nextRound(io, roomId);
}

export function registerMatchmakingHandlers(io: GameServer, socket: GameSocket) {
  socket.on("joinMatchmaking", () => {
    const playerId = socket.data.playerId;
    console.log(`[joinMatchmaking] socketId=${socket.id}, playerId=${playerId}`);

    if (!playerId) {
      console.log(`[joinMatchmaking] ERROR: Player not registered`);
      socket.emit("error", "Player not registered");
      return;
    }

    const result = roomManager.joinQueue(playerId);
    console.log(`[joinMatchmaking] joinQueue result:`, result ? `room created with id=${result.id}` : "added to queue");

    if (result) {
      for (const [pId] of result.players) {
        const playerSocketId = roomManager.getSocketIdByPlayer(pId);
        console.log(`[joinMatchmaking] player ${pId} -> socketId=${playerSocketId}`);
        if (playerSocketId) {
          const playerSocket = io.sockets.sockets.get(playerSocketId);
          console.log(`[joinMatchmaking] playerSocket found: ${!!playerSocket}`);
          playerSocket?.join(result.id);
          roomManager.setPlayerSocket(result.id, pId, playerSocketId);
        }
      }

      const players: PlayerInfo[] = [];
      for (const [id] of result.players) {
        players.push({
          id,
          score: 0,
        });
      }

      console.log(`[joinMatchmaking] emitting matchFound to room ${result.id}`);
      io.to(result.id).emit("matchFound", {
        roomId: result.id,
        players,
      });

      setTimeout(() => {
        startMultiplayerGame(io, result.id);
      }, 1500);
    } else {
      console.log(`[joinMatchmaking] emitting matchmakingStatus waiting=true`);
      socket.emit("matchmakingStatus", { waiting: true });
    }
  });

  socket.on("leaveMatchmaking", () => {
    const playerId = socket.data.playerId;
    if (playerId) {
      roomManager.leaveQueue(playerId);
    }
    socket.emit("matchmakingStatus", { waiting: false });
  });
}
