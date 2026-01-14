import type { Server, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "../types";
import { getRandomMovie, getMovieById } from "../../game/movies";
import { checkAnswer } from "../../game/validation";

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

export function registerGameHandlers(_io: GameServer, socket: GameSocket) {
  socket.on("getMovie", (excludeId?: number) => {
    const movie = getRandomMovie(excludeId);
    socket.data.currentMovieId = movie.id;

    socket.emit("movieData", {
      id: movie.id,
      emojis: movie.emojis,
    });
  });

  socket.on("checkAnswer", ({ movieId, guess }) => {
    const movie = getMovieById(movieId);

    if (!movie) {
      socket.emit("error", "Movie not found");
      return;
    }

    const isCorrect = checkAnswer(guess, movie.answers);

    socket.emit("answerResult", {
      correct: isCorrect,
      answer: isCorrect ? movie.answers[0] : undefined,
    });
  });

  socket.on("timeout", (movieId: number) => {
    const movie = getMovieById(movieId);

    if (movie) {
      socket.emit("answerResult", {
        correct: false,
        answer: movie.answers[0],
      });
    }
  });
}
