"use client";

import { useState, useCallback, useRef } from "react";
import { getSocket, disconnectSocket } from "@/lib/socket";
import type {
  RoomState,
  RoundResult,
  GameEndResult,
  PlayerInfo,
  CheckAnswerResult,
} from "@/types/socket";

type UseMultiplayerSocketReturn = {
  isConnected: boolean;
  isSearching: boolean;
  roomState: RoomState | null;
  mySocketId: string | null;
  connect: () => void;
  disconnect: () => void;
  joinMatchmaking: () => void;
  leaveMatchmaking: () => void;
  submitAnswer: (roomId: string, movieId: number, guess: string) => void;
  reportTimeout: (roomId: string, movieId: number) => void;
  onMatchFound: (
    callback: (data: { roomId: string; players: PlayerInfo[] }) => void
  ) => void;
  onRoundResult: (callback: (result: RoundResult) => void) => void;
  onGameEnd: (callback: (result: GameEndResult) => void) => void;
  onOpponentLeft: (callback: () => void) => void;
  onWrongAnswer: (callback: () => void) => void;
};

export function useMultiplayerSocket(): UseMultiplayerSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [mySocketId, setMySocketId] = useState<string | null>(null);

  const matchFoundCallbackRef = useRef<
    ((data: { roomId: string; players: PlayerInfo[] }) => void) | null
  >(null);
  const roundResultCallbackRef = useRef<((result: RoundResult) => void) | null>(
    null
  );
  const gameEndCallbackRef = useRef<((result: GameEndResult) => void) | null>(
    null
  );
  const opponentLeftCallbackRef = useRef<(() => void) | null>(null);
  const wrongAnswerCallbackRef = useRef<(() => void) | null>(null);
  const setupDoneRef = useRef(false);

  const setupListeners = useCallback((socket: ReturnType<typeof getSocket>) => {
    socket.off("matchmakingStatus");
    socket.off("matchFound");
    socket.off("roomState");
    socket.off("roundResult");
    socket.off("gameEnd");
    socket.off("opponentLeft");
    socket.off("answerResult");

    socket.on("matchmakingStatus", ({ waiting }) => {
      setIsSearching(waiting);
    });

    socket.on("matchFound", (data) => {
      setIsSearching(false);
      matchFoundCallbackRef.current?.(data);
    });

    socket.on("roomState", (state) => {
      setRoomState(state);
    });

    socket.on("roundResult", (result) => {
      roundResultCallbackRef.current?.(result);
    });

    socket.on("gameEnd", (result) => {
      gameEndCallbackRef.current?.(result);
    });

    socket.on("opponentLeft", () => {
      opponentLeftCallbackRef.current?.();
    });

    socket.on("answerResult", (result: CheckAnswerResult) => {
      if (!result.correct) {
        wrongAnswerCallbackRef.current?.();
      }
    });
  }, []);

  const connect = useCallback(() => {
    if (setupDoneRef.current) return;
    setupDoneRef.current = true;

    const socket = getSocket();

    socket.off("connect");
    socket.off("disconnect");

    socket.on("connect", () => {
      setIsConnected(true);
      setMySocketId(socket.id || null);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setMySocketId(null);
    });

    setupListeners(socket);

    if (socket.connected) {
      setIsConnected(true);
      setMySocketId(socket.id || null);
    } else {
      socket.connect();
    }
  }, [setupListeners]);

  const disconnect = useCallback(() => {
    disconnectSocket();
    setIsConnected(false);
    setIsSearching(false);
    setRoomState(null);
    setMySocketId(null);
    setupDoneRef.current = false;
  }, []);

  const joinMatchmaking = useCallback(() => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("joinMatchmaking");
    }
  }, []);

  const leaveMatchmaking = useCallback(() => {
    getSocket().emit("leaveMatchmaking");
    setIsSearching(false);
  }, []);

  const submitAnswer = useCallback(
    (roomId: string, movieId: number, guess: string) => {
      getSocket().emit("multiplayerAnswer", { roomId, movieId, guess });
    },
    []
  );

  const reportTimeout = useCallback((roomId: string, movieId: number) => {
    getSocket().emit("multiplayerTimeout", { roomId, movieId });
  }, []);

  const onMatchFound = useCallback(
    (callback: (data: { roomId: string; players: PlayerInfo[] }) => void) => {
      matchFoundCallbackRef.current = callback;
    },
    []
  );

  const onRoundResult = useCallback(
    (callback: (result: RoundResult) => void) => {
      roundResultCallbackRef.current = callback;
    },
    []
  );

  const onGameEnd = useCallback((callback: (result: GameEndResult) => void) => {
    gameEndCallbackRef.current = callback;
  }, []);

  const onOpponentLeft = useCallback((callback: () => void) => {
    opponentLeftCallbackRef.current = callback;
  }, []);

  const onWrongAnswer = useCallback((callback: () => void) => {
    wrongAnswerCallbackRef.current = callback;
  }, []);

  return {
    isConnected,
    isSearching,
    roomState,
    mySocketId,
    connect,
    disconnect,
    joinMatchmaking,
    leaveMatchmaking,
    submitAnswer,
    reportTimeout,
    onMatchFound,
    onRoundResult,
    onGameEnd,
    onOpponentLeft,
    onWrongAnswer,
  };
}
