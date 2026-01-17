"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { getSocket, disconnectSocket, signalIntentionalLeave } from "@/lib/socket";
import { getOrCreatePlayerId, setActiveRoom, clearActiveRoom } from "@/lib/session";
import type {
  RoomState,
  RoundResult,
  GameEndResult,
  PlayerInfo,
  CheckAnswerResult,
  ReconnectSuccessData,
  ReconnectFailedData,
  RoundStartData,
  TimeSyncData,
  RoundTimeoutData,
} from "@/types/socket";

export type OpponentStatus = "connected" | "disconnected" | "left";

type UseMultiplayerSocketReturn = {
  isConnected: boolean;
  isSearching: boolean;
  roomState: RoomState | null;
  roundEndTime: number | null;
  myPlayerId: string;
  opponentStatus: OpponentStatus;
  reconnectCountdown: number | null;
  connect: () => void;
  disconnect: () => void;
  joinMatchmaking: () => void;
  leaveMatchmaking: () => void;
  submitAnswer: (roomId: string, movieId: number, guess: string) => void;
  attemptReconnect: (roomId: string) => void;
  signalLeave: (roomId: string) => void;
  onMatchFound: (
    callback: (data: { roomId: string; players: PlayerInfo[] }) => void
  ) => void;
  onRoundStart: (callback: (data: RoundStartData) => void) => void;
  onTimeSync: (callback: (data: TimeSyncData) => void) => void;
  onRoundTimeout: (callback: (data: RoundTimeoutData) => void) => void;
  onRoundResult: (callback: (result: RoundResult) => void) => void;
  onGameEnd: (callback: (result: GameEndResult) => void) => void;
  onOpponentLeft: (callback: () => void) => void;
  onWrongAnswer: (callback: () => void) => void;
  onReconnectSuccess: (callback: (data: ReconnectSuccessData) => void) => void;
  onReconnectFailed: (callback: (data: ReconnectFailedData) => void) => void;
};

export function useMultiplayerSocket(): UseMultiplayerSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [roundEndTime, setRoundEndTime] = useState<number | null>(null);
  const [opponentStatus, setOpponentStatus] = useState<OpponentStatus>("connected");
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);

  const myPlayerId = getOrCreatePlayerId();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const matchFoundCallbackRef = useRef<
    ((data: { roomId: string; players: PlayerInfo[] }) => void) | null
  >(null);
  const roundStartCallbackRef = useRef<((data: RoundStartData) => void) | null>(null);
  const timeSyncCallbackRef = useRef<((data: TimeSyncData) => void) | null>(null);
  const roundTimeoutCallbackRef = useRef<((data: RoundTimeoutData) => void) | null>(null);
  const roundResultCallbackRef = useRef<((result: RoundResult) => void) | null>(
    null
  );
  const gameEndCallbackRef = useRef<((result: GameEndResult) => void) | null>(
    null
  );
  const opponentLeftCallbackRef = useRef<(() => void) | null>(null);
  const wrongAnswerCallbackRef = useRef<(() => void) | null>(null);
  const reconnectSuccessCallbackRef = useRef<((data: ReconnectSuccessData) => void) | null>(null);
  const reconnectFailedCallbackRef = useRef<((data: ReconnectFailedData) => void) | null>(null);
  const setupDoneRef = useRef(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdownTimer = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setReconnectCountdown(null);
  }, []);

  const startCountdown = useCallback((seconds: number) => {
    clearCountdownTimer();
    setReconnectCountdown(seconds);

    countdownTimerRef.current = setInterval(() => {
      setReconnectCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearCountdownTimer();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdownTimer]);

  const setupListeners = useCallback((socket: ReturnType<typeof getSocket>) => {
    socket.off("matchmakingStatus");
    socket.off("matchFound");
    socket.off("roomState");
    socket.off("roundStart");
    socket.off("timeSync");
    socket.off("roundTimeout");
    socket.off("roundResult");
    socket.off("gameEnd");
    socket.off("opponentLeft");
    socket.off("answerResult");
    socket.off("reconnectSuccess");
    socket.off("reconnectFailed");
    socket.off("opponentDisconnected");
    socket.off("opponentReconnected");
    socket.off("opponentLeftPermanently");

    socket.on("matchmakingStatus", ({ waiting }) => {
      if (!mountedRef.current) return;
      setIsSearching(waiting);
    });

    socket.on("matchFound", (data) => {
      if (!mountedRef.current) return;
      setIsSearching(false);
      setActiveRoom(data.roomId);
      setOpponentStatus("connected");
      matchFoundCallbackRef.current?.(data);
    });

    socket.on("roomState", (state) => {
      if (!mountedRef.current) return;
      setRoomState(state);
    });

    socket.on("roundStart", (data) => {
      if (!mountedRef.current) return;
      setRoundEndTime(data.endTime);
      roundStartCallbackRef.current?.(data);
    });

    socket.on("timeSync", (data) => {
      if (!mountedRef.current) return;
      timeSyncCallbackRef.current?.(data);
    });

    socket.on("roundTimeout", (data) => {
      if (!mountedRef.current) return;
      setRoundEndTime(null);
      roundTimeoutCallbackRef.current?.(data);
    });

    socket.on("roundResult", (result) => {
      setRoundEndTime(null);
      roundResultCallbackRef.current?.(result);
    });

    socket.on("gameEnd", (result) => {
      clearActiveRoom();
      setRoundEndTime(null);
      gameEndCallbackRef.current?.(result);
    });

    socket.on("opponentLeft", () => {
      if (!mountedRef.current) return;
      clearActiveRoom();
      setOpponentStatus("left");
      setRoundEndTime(null);
      opponentLeftCallbackRef.current?.();
    });

    socket.on("answerResult", (result: CheckAnswerResult) => {
      if (!result.correct) {
        wrongAnswerCallbackRef.current?.();
      }
    });

    socket.on("reconnectSuccess", (data) => {
      if (!mountedRef.current) return;
      setRoomState(data.roomState);
      setRoundEndTime(data.roundEndTime);
      setOpponentStatus(data.opponentConnected ? "connected" : "disconnected");
      reconnectSuccessCallbackRef.current?.(data);
    });

    socket.on("reconnectFailed", (data) => {
      clearActiveRoom();
      reconnectFailedCallbackRef.current?.(data);
    });

    socket.on("opponentDisconnected", ({ reconnectTimeoutSeconds }) => {
      if (!mountedRef.current) return;
      setOpponentStatus("disconnected");
      startCountdown(reconnectTimeoutSeconds);
    });

    socket.on("opponentReconnected", () => {
      if (!mountedRef.current) return;
      setOpponentStatus("connected");
      clearCountdownTimer();
    });

    socket.on("opponentLeftPermanently", () => {
      if (!mountedRef.current) return;
      clearActiveRoom();
      setOpponentStatus("left");
      setRoundEndTime(null);
      clearCountdownTimer();
      opponentLeftCallbackRef.current?.();
    });
  }, [startCountdown, clearCountdownTimer]);

  const connect = useCallback(() => {
    if (setupDoneRef.current) return;
    setupDoneRef.current = true;

    const socket = getSocket();

    socket.off("connect");
    socket.off("disconnect");

    socket.on("connect", () => {
      if (mountedRef.current) {
        setIsConnected(true);
      }
      socket.emit("registerPlayer", { playerId: myPlayerId });
    });

    socket.on("disconnect", () => {
      if (mountedRef.current) {
        setIsConnected(false);
      }
    });

    setupListeners(socket);

    if (socket.connected) {
      if (mountedRef.current) {
        setIsConnected(true);
      }
      socket.emit("registerPlayer", { playerId: myPlayerId });
    } else {
      socket.connect();
    }
  }, [setupListeners, myPlayerId]);

  const disconnect = useCallback(() => {
    clearCountdownTimer();
    disconnectSocket();
    setIsConnected(false);
    setIsSearching(false);
    setRoomState(null);
    setRoundEndTime(null);
    setOpponentStatus("connected");
    setupDoneRef.current = false;
  }, [clearCountdownTimer]);

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

  const attemptReconnect = useCallback((roomId: string) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("attemptReconnect", { playerId: myPlayerId, roomId });
    }
  }, [myPlayerId]);

  const signalLeave = useCallback((roomId: string) => {
    clearActiveRoom();
    signalIntentionalLeave(roomId);
  }, []);

  const onMatchFound = useCallback(
    (callback: (data: { roomId: string; players: PlayerInfo[] }) => void) => {
      matchFoundCallbackRef.current = callback;
    },
    []
  );

  const onRoundStart = useCallback(
    (callback: (data: RoundStartData) => void) => {
      roundStartCallbackRef.current = callback;
    },
    []
  );

  const onTimeSync = useCallback(
    (callback: (data: TimeSyncData) => void) => {
      timeSyncCallbackRef.current = callback;
    },
    []
  );

  const onRoundTimeout = useCallback(
    (callback: (data: RoundTimeoutData) => void) => {
      roundTimeoutCallbackRef.current = callback;
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

  const onReconnectSuccess = useCallback((callback: (data: ReconnectSuccessData) => void) => {
    reconnectSuccessCallbackRef.current = callback;
  }, []);

  const onReconnectFailed = useCallback((callback: (data: ReconnectFailedData) => void) => {
    reconnectFailedCallbackRef.current = callback;
  }, []);

  return {
    isConnected,
    isSearching,
    roomState,
    roundEndTime,
    myPlayerId,
    opponentStatus,
    reconnectCountdown,
    connect,
    disconnect,
    joinMatchmaking,
    leaveMatchmaking,
    submitAnswer,
    attemptReconnect,
    signalLeave,
    onMatchFound,
    onRoundStart,
    onTimeSync,
    onRoundTimeout,
    onRoundResult,
    onGameEnd,
    onOpponentLeft,
    onWrongAnswer,
    onReconnectSuccess,
    onReconnectFailed,
  };
}
