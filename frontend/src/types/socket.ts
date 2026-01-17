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

export type RoundStartData = {
  movie: MovieData;
  round: number;
  totalRounds: number;
  endTime: number;
  durationMs: number;
};

export type TimeSyncData = {
  remainingMs: number;
};

export type RoundTimeoutData = {
  correctAnswer: string;
  scores: Record<string, number>;
};

export type ReconnectSuccessData = {
  roomState: RoomState;
  opponentConnected: boolean;
  roundEndTime: number | null;
};

export type ReconnectFailedData = {
  reason: "room_closed" | "player_not_found" | "invalid_room";
};

export interface ServerToClientEvents {
  movieData: (movie: MovieData) => void;
  answerResult: (result: CheckAnswerResult) => void;
  error: (message: string) => void;
  matchmakingStatus: (data: { waiting: boolean }) => void;
  matchFound: (data: { roomId: string; players: PlayerInfo[] }) => void;
  roomState: (state: RoomState) => void;
  roundStart: (data: RoundStartData) => void;
  timeSync: (data: TimeSyncData) => void;
  roundTimeout: (data: RoundTimeoutData) => void;
  roundResult: (result: RoundResult) => void;
  gameEnd: (result: GameEndResult) => void;
  opponentLeft: () => void;
  reconnectSuccess: (data: ReconnectSuccessData) => void;
  reconnectFailed: (data: ReconnectFailedData) => void;
  opponentDisconnected: (data: { reconnectTimeoutSeconds: number }) => void;
  opponentReconnected: () => void;
  opponentLeftPermanently: () => void;
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
  registerPlayer: (data: { playerId: string }) => void;
  attemptReconnect: (data: { playerId: string; roomId: string }) => void;
  intentionalLeave: (data: { roomId: string }) => void;
}
