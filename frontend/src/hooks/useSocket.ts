"use client";

import { useState, useCallback, useRef } from "react";
import { getSocket, disconnectSocket } from "@/lib/socket";
import type { MovieData, CheckAnswerResult } from "@/types/socket";

type UseSocketReturn = {
  isConnected: boolean;
  currentMovie: MovieData | null;
  connect: () => void;
  disconnect: () => void;
  requestMovie: (excludeId?: number) => void;
  submitAnswer: (movieId: number, guess: string) => void;
  reportTimeout: (movieId: number) => void;
  onAnswerResult: (callback: (result: CheckAnswerResult) => void) => void;
};

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [currentMovie, setCurrentMovie] = useState<MovieData | null>(null);
  const answerCallbackRef = useRef<((result: CheckAnswerResult) => void) | null>(null);
  const initializedRef = useRef(false);

  const connect = useCallback(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const socket = getSocket();

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("movieData", (movie) => setCurrentMovie(movie));
    socket.on("answerResult", (result) => {
      answerCallbackRef.current?.(result);
    });

    socket.connect();
  }, []);

  const disconnect = useCallback(() => {
    disconnectSocket();
    setIsConnected(false);
    setCurrentMovie(null);
    initializedRef.current = false;
  }, []);

  const requestMovie = useCallback((excludeId?: number) => {
    getSocket().emit("getMovie", excludeId);
  }, []);

  const submitAnswer = useCallback((movieId: number, guess: string) => {
    getSocket().emit("checkAnswer", { movieId, guess });
  }, []);

  const reportTimeout = useCallback((movieId: number) => {
    getSocket().emit("timeout", movieId);
  }, []);

  const onAnswerResult = useCallback((callback: (result: CheckAnswerResult) => void) => {
    answerCallbackRef.current = callback;
  }, []);

  return {
    isConnected,
    currentMovie,
    connect,
    disconnect,
    requestMovie,
    submitAnswer,
    reportTimeout,
    onAnswerResult,
  };
}
