import type { Server, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  PlayerInfo,
} from "../types.js";
import { roomManager } from "../../matchmaking/room-manager.js";
import { getMovieById, getRandomMovieExcluding } from "../../game/movies.js";
import { checkAnswer } from "../../game/validation.js";

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

function nextRound(io: GameServer, roomId: string) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const movie = getRandomMovieExcluding(room.state.usedMovieIds);
  const hasMoreRounds = roomManager.prepareNextRound(roomId, movie.id);

  if (!hasMoreRounds) {
    endGame(io, roomId);
    return;
  }

  const players: PlayerInfo[] = Array.from(room.players).map((id) => ({
    id,
    score: room.state.scores.get(id) || 0,
  }));

  io.to(roomId).emit("roomState", {
    roomId: room.id,
    players,
    currentMovie: { id: movie.id, emojis: movie.emojis },
    round: room.state.round,
    totalRounds: room.state.totalRounds,
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
      for (const playerId of room.players) {
        const socket = io.sockets.sockets.get(playerId);
        socket?.leave(roomId);
      }
      roomManager.deleteRoom(roomId);
    }
  }, 5000);
}

export function registerMultiplayerHandlers(io: GameServer, socket: GameSocket) {
  socket.on("multiplayerAnswer", ({ roomId, movieId, guess }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.state.roundAnswered) return;

    const movie = getMovieById(movieId);
    if (!movie) return;

    const isCorrect = checkAnswer(guess, movie.answers);

    if (isCorrect) {
      const wasFirst = roomManager.recordCorrectAnswer(roomId, socket.id);

      if (wasFirst) {
        io.to(roomId).emit("roundResult", {
          winnerId: socket.id,
          correctAnswer: movie.answers[0],
          scores: roomManager.getScores(roomId),
        });

        if (roomManager.isGameOver(roomId)) {
          setTimeout(() => endGame(io, roomId), 2500);
        } else {
          setTimeout(() => nextRound(io, roomId), 2500);
        }
      }
    } else {
      socket.emit("answerResult", { correct: false });
    }
  });

  socket.on("multiplayerTimeout", ({ roomId, movieId }) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.state.roundAnswered) return;

    roomManager.markRoundAnswered(roomId);
    const movie = getMovieById(movieId);

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
  });
}
