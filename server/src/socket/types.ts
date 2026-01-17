export type MovieData = {
  id: number;
  emojis: string;
};

export type CheckAnswerResult = {
  correct: boolean;
  answer?: string;
};

export type PlayerInfo = {
  id: string;
  score: number;
};

export type RoomState = {
  roomId: string;
  players: PlayerInfo[];
  currentMovie: MovieData | null;
  round: number;
  totalRounds: number;
};

export type RoundResult = {
  winnerId: string | null;
  correctAnswer: string;
  scores: Record<string, number>;
};

export type GameEndResult = {
  winnerId: string | null;
  finalScores: Record<string, number>;
};

export interface ServerToClientEvents {
  movieData: (movie: MovieData) => void;
  answerResult: (result: CheckAnswerResult) => void;
  error: (message: string) => void;
  matchmakingStatus: (data: { waiting: boolean }) => void;
  matchFound: (data: { roomId: string; players: PlayerInfo[] }) => void;
  roomState: (state: RoomState) => void;
  roundResult: (result: RoundResult) => void;
  gameEnd: (result: GameEndResult) => void;
  opponentLeft: () => void;
}

export interface ClientToServerEvents {
  getMovie: (excludeId?: number) => void;
  checkAnswer: (data: { movieId: number; guess: string }) => void;
  timeout: (movieId: number) => void;
  joinMatchmaking: () => void;
  leaveMatchmaking: () => void;
  multiplayerAnswer: (data: {
    roomId: string;
    movieId: number;
    guess: string;
  }) => void;
  multiplayerTimeout: (data: { roomId: string; movieId: number }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  sessionId: string;
  currentMovieId?: number;
}
