export type MovieData = {
  id: number;
  emojis: string;
};

export type CheckAnswerResult = {
  correct: boolean;
  answer?: string;
};

export interface ServerToClientEvents {
  movieData: (movie: MovieData) => void;
  answerResult: (result: CheckAnswerResult) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  getMovie: (excludeId?: number) => void;
  checkAnswer: (data: { movieId: number; guess: string }) => void;
  timeout: (movieId: number) => void;
}
