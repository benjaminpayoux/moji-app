"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMultiplayerSocket } from "@/hooks/useMultiplayerSocket";
import { getActiveRoom, clearActiveRoom } from "@/lib/session";
import type { RoundResult, GameEndResult, ReconnectFailedData, RoundStartData, TimeSyncData } from "@/types/socket";

const TIMER_DISPLAY_INTERVAL_MS = 100;

type GamePhase = "waiting" | "playing" | "round_result" | "game_end" | "reconnecting";

function getResultTextColor(isTie: boolean | null, didWin: boolean): string {
  if (isTie) return "text-[#7c3aed]";
  if (didWin) return "text-[#10b981]";
  return "text-[#f87171]";
}

function getResultText(isTie: boolean | null, didWin: boolean): string {
  if (isTie) return "Égalité !";
  if (didWin) return "Victoire !";
  return "Défaite...";
}

function getRoundResultColor(winnerId: string | null, didWinRound: boolean): string {
  if (winnerId === null || !didWinRound) return "text-[#f87171]";
  return "text-[#10b981]";
}

function getRoundResultText(winnerId: string | null, didWinRound: boolean): string {
  if (winnerId === null) return "Temps écoulé !";
  if (didWinRound) return "Bravo !";
  return "Trop lent !";
}

export function MultiplayerGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get("roomId");

  const {
    isConnected,
    roomState,
    roundEndTime,
    myPlayerId,
    opponentStatus,
    connect,
    disconnect,
    submitAnswer,
    attemptReconnect,
    signalLeave,
    onRoundStart,
    onTimeSync,
    onRoundResult,
    onGameEnd,
    onOpponentLeft,
    onWrongAnswer,
    onReconnectSuccess,
    onReconnectFailed,
  } = useMultiplayerSocket();

  const [guess, setGuess] = useState("");
  const [isError, setIsError] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [gameResult, setGameResult] = useState<GameEndResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(20);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(roomIdFromUrl);

  const inputRef = useRef<HTMLInputElement>(null);
  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptedRef = useRef(false);
  const roundEndTimeRef = useRef<number | null>(null);

  const clearDisplayTimer = useCallback(() => {
    if (displayTimerRef.current) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }
  }, []);

  const startDisplayTimer = useCallback(() => {
    clearDisplayTimer();

    displayTimerRef.current = setInterval(() => {
      if (roundEndTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((roundEndTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    }, TIMER_DISPLAY_INTERVAL_MS);
  }, [clearDisplayTimer]);

  onRoundStart(
    useCallback(
      (data: RoundStartData) => {
        roundEndTimeRef.current = data.endTime;
        setTimeLeft(Math.ceil(data.durationMs / 1000));
        setPhase("playing");
        if (data.round === 1 || !displayTimerRef.current) {
          startDisplayTimer();
        }
      },
      [startDisplayTimer]
    )
  );

  onTimeSync(
    useCallback(
      (data: TimeSyncData) => {
        if (roundEndTimeRef.current) {
          roundEndTimeRef.current = Date.now() + data.remainingMs;
        }
      },
      []
    )
  );

  onRoundResult(
    useCallback(
      (result: RoundResult) => {
        clearDisplayTimer();
        roundEndTimeRef.current = null;
        setRoundResult(result);
        setPhase("round_result");
        setGuess("");
        setIsError(false);
      },
      [clearDisplayTimer]
    )
  );

  onGameEnd(
    useCallback(
      (result: GameEndResult) => {
        clearDisplayTimer();
        roundEndTimeRef.current = null;
        if (roundTransitionTimeoutRef.current) {
          clearTimeout(roundTransitionTimeoutRef.current);
          roundTransitionTimeoutRef.current = null;
        }
        setGameResult(result);
        setPhase("game_end");
      },
      [clearDisplayTimer]
    )
  );

  onOpponentLeft(
    useCallback(() => {
      clearDisplayTimer();
      roundEndTimeRef.current = null;
    }, [clearDisplayTimer])
  );

  onWrongAnswer(
    useCallback(() => {
      setIsError(true);
      inputRef.current?.select();
    }, [])
  );

  onReconnectSuccess(
    useCallback(() => {
      setPhase("playing");
      startDisplayTimer();
    }, [startDisplayTimer])
  );

  onReconnectFailed(
    useCallback((_data: ReconnectFailedData) => {
      clearActiveRoom();
      router.push("/mode?error=room_closed");
    }, [router])
  );

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (isConnected && !reconnectAttemptedRef.current) {
      reconnectAttemptedRef.current = true;
      const savedRoomId = getActiveRoom();
      const roomIdToUse = roomIdFromUrl || savedRoomId;

      if (roomIdToUse) {
        setPhase("reconnecting");
        setCurrentRoomId(roomIdToUse);
        attemptReconnect(roomIdToUse);
      }
    }
  }, [isConnected, roomIdFromUrl, attemptReconnect]);

  useEffect(() => {
    if (roomState?.roomId && roomState.roomId !== currentRoomId) {
      setCurrentRoomId(roomState.roomId);
    }
  }, [roomState?.roomId, currentRoomId]);

  useEffect(() => {
    if (roundEndTime) {
      roundEndTimeRef.current = roundEndTime;
      if (!displayTimerRef.current) {
        startDisplayTimer();
      }
    }
  }, [roundEndTime, startDisplayTimer]);

  useEffect(() => {
    return () => {
      clearDisplayTimer();
    };
  }, [clearDisplayTimer]);

  const handleSubmit = useCallback(() => {
    if (!currentRoomId || !roomState?.currentMovie || !guess.trim()) return;
    submitAnswer(currentRoomId, roomState.currentMovie.id, guess);
  }, [currentRoomId, roomState?.currentMovie, guess, submitAnswer]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGuess(e.target.value);
    if (isError) {
      setIsError(false);
    }
  };

  const handleReturnToMenu = useCallback(() => {
    if (currentRoomId) {
      signalLeave(currentRoomId);
    }
    disconnect();
    router.push("/mode");
  }, [currentRoomId, signalLeave, disconnect, router]);

  const myScore = myPlayerId ? roomState?.players.find((p) => p.id === myPlayerId)?.score ?? 0 : 0;
  const opponent = roomState?.players.find((p) => p.id !== myPlayerId);
  const opponentScore = opponent?.score ?? 0;

  const didIWinRound = roundResult?.winnerId === myPlayerId;
  const didIWinGame = gameResult?.winnerId === myPlayerId;
  const isTie = gameResult && gameResult.winnerId === null;

  if (opponentStatus === "left") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fffbf5] overflow-hidden">
        <div className="game-container relative w-full max-w-[420px] px-6 py-8 bg-[#fffbf5] text-center">
          <div className="absolute -top-[15px] -left-[15px] w-[50px] h-[50px] bg-[#fcd34d] rounded-full opacity-50" />
          <div className="absolute -bottom-[10px] -right-[10px] w-[70px] h-[70px] bg-[#a78bfa] rounded-[1rem] rotate-[15deg] opacity-30" />

          <h1 className="font-[family-name:var(--font-fredoka)] font-bold text-[3rem] text-[#7c3aed] mb-[0.3rem] relative z-[1]">
            Play<span className="text-[#ec4899]">Moji</span>
          </h1>

          <div className="relative z-[1] mb-6">
            <div
              className="h-[120px] px-4 bg-white rounded-[1.25rem] border-4 border-[#e9d5ff] w-full flex flex-col items-center justify-center gap-2"
              style={{ boxShadow: "5px 5px 0px #fce7f3, 10px 10px 0px #ddd6fe" }}
            >
              <span className="text-[2rem]">😢</span>
              <span className="font-[family-name:var(--font-fredoka)] font-semibold text-[1.25rem] text-[#f87171]">
                Adversaire parti
              </span>
            </div>
          </div>

          <div className="relative z-[1]">
            <Button onClick={handleReturnToMenu}>Retour au menu</Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "reconnecting") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fffbf5] overflow-hidden">
        <div className="game-container relative w-full max-w-[420px] px-6 py-8 bg-[#fffbf5] text-center">
          <div className="absolute -top-[15px] -left-[15px] w-[50px] h-[50px] bg-[#fcd34d] rounded-full opacity-50" />
          <div className="absolute -bottom-[10px] -right-[10px] w-[70px] h-[70px] bg-[#a78bfa] rounded-[1rem] rotate-[15deg] opacity-30" />

          <h1 className="font-[family-name:var(--font-fredoka)] font-bold text-[3rem] text-[#7c3aed] mb-[0.3rem] relative z-[1]">
            Play<span className="text-[#ec4899]">Moji</span>
          </h1>

          <div className="relative z-[1] mb-6">
            <div
              className="h-[120px] px-4 bg-white rounded-[1.25rem] border-4 border-[#e9d5ff] w-full flex flex-col items-center justify-center gap-2"
              style={{ boxShadow: "5px 5px 0px #fce7f3, 10px 10px 0px #ddd6fe" }}
            >
              <span className="text-[2rem]">🔄</span>
              <span className="font-[family-name:var(--font-fredoka)] font-semibold text-[1.25rem] text-[#a78bfa]">
                Reconnexion...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "game_end" && gameResult) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fffbf5] overflow-hidden">
        <div className="game-container relative w-full max-w-[420px] px-6 py-8 bg-[#fffbf5] text-center">
          <div className="absolute -top-[15px] -left-[15px] w-[50px] h-[50px] bg-[#fcd34d] rounded-full opacity-50" />
          <div className="absolute -bottom-[10px] -right-[10px] w-[70px] h-[70px] bg-[#a78bfa] rounded-[1rem] rotate-[15deg] opacity-30" />

          <h1 className="font-[family-name:var(--font-fredoka)] font-bold text-[3rem] text-[#7c3aed] mb-[0.3rem] relative z-[1]">
            Play<span className="text-[#ec4899]">Moji</span>
          </h1>
          <p className="font-[family-name:var(--font-quicksand)] font-semibold text-[1rem] text-[#a78bfa] mb-8 relative z-[1]">
            Partie terminée
          </p>

          <div className="relative z-[1] mb-6">
            <div
              className="min-h-[120px] px-4 py-6 bg-white rounded-[1.25rem] border-4 border-[#e9d5ff] w-full flex flex-col items-center justify-center gap-4"
              style={{ boxShadow: "5px 5px 0px #fce7f3, 10px 10px 0px #ddd6fe" }}
            >
              <span className="text-[3rem]">
                {isTie ? "🤝" : didIWinGame ? "🏆" : "😔"}
              </span>
              <span
                className={`font-[family-name:var(--font-fredoka)] font-semibold text-[1.5rem] ${getResultTextColor(isTie, didIWinGame)}`}
              >
                {getResultText(isTie, didIWinGame)}
              </span>

              <div className="flex gap-8 mt-2">
                <div className="flex flex-col items-center">
                  <span className="font-[family-name:var(--font-quicksand)] font-semibold text-sm text-[#a78bfa]">
                    Toi
                  </span>
                  <span className="font-[family-name:var(--font-fredoka)] font-bold text-2xl text-[#7c3aed]">
                    {myPlayerId ? gameResult.finalScores[myPlayerId] ?? 0 : 0}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-[family-name:var(--font-quicksand)] font-semibold text-sm text-[#a78bfa]">
                    Adversaire
                  </span>
                  <span className="font-[family-name:var(--font-fredoka)] font-bold text-2xl text-[#ec4899]">
                    {opponent ? gameResult.finalScores[opponent.id] ?? 0 : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-[1]">
            <Button onClick={handleReturnToMenu}>Retour au menu</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[#fffbf5] overflow-hidden">
      <div className="game-container relative w-full max-w-[420px] px-6 py-8 bg-[#fffbf5] text-center">
        <div className="absolute -top-[15px] -left-[15px] w-[50px] h-[50px] bg-[#fcd34d] rounded-full opacity-50" />
        <div className="absolute -bottom-[10px] -right-[10px] w-[70px] h-[70px] bg-[#a78bfa] rounded-[1rem] rotate-[15deg] opacity-30" />
        <div
          className="absolute top-[30px] right-[40px] w-[35px] h-[35px] bg-[#f9a8d4] opacity-40"
          style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }}
        />
        <div className="absolute bottom-[60px] -left-[20px] w-[40px] h-[40px] bg-[#7dd3fc] rounded-[8px] -rotate-[10deg] opacity-40" />

        <h1 className="font-[family-name:var(--font-fredoka)] font-bold text-[2.5rem] text-[#7c3aed] mb-[0.3rem] relative z-[1]">
          Play<span className="text-[#ec4899]">Moji</span>
        </h1>

        {opponentStatus === "disconnected" && (
          <div className="relative z-[1] mb-2">
            <div className="bg-[#fef3c7] border-2 border-[#fcd34d] rounded-lg px-3 py-2">
              <span className="font-[family-name:var(--font-quicksand)] font-semibold text-sm text-[#b45309]">
                Adversaire déconnecté
              </span>
            </div>
          </div>
        )}

        <div className="relative z-[1] mb-4 flex justify-center gap-6">
          <div className="flex flex-col items-center">
            <span className="font-[family-name:var(--font-quicksand)] font-semibold text-xs text-[#a78bfa]">
              Toi
            </span>
            <span className="font-[family-name:var(--font-fredoka)] font-bold text-xl text-[#7c3aed]">
              {myScore}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-[family-name:var(--font-quicksand)] font-semibold text-xs text-[#a78bfa]">
              Round
            </span>
            <span className="font-[family-name:var(--font-fredoka)] font-bold text-xl text-[#7c3aed]">
              {roomState?.round ?? 0}/{roomState?.totalRounds ?? 10}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-[family-name:var(--font-quicksand)] font-semibold text-xs text-[#a78bfa]">
              Adversaire
            </span>
            <span className="font-[family-name:var(--font-fredoka)] font-bold text-xl text-[#ec4899]">
              {opponentScore}
            </span>
          </div>
        </div>

        <div className="relative z-[1] mb-6">
          {phase === "playing" && roomState?.currentMovie && (
            <div
              className={`absolute -top-3 -right-3 flex items-center justify-center w-10 h-10 rounded-full font-[family-name:var(--font-quicksand)] font-bold text-base z-10 transition-colors ${
                timeLeft <= 5
                  ? "bg-[#fef2f2] text-[#f87171] border-2 border-[#f87171]"
                  : "bg-[#ddd6fe] text-[#7c3aed] border-2 border-[#7c3aed]"
              }`}
            >
              {timeLeft}
            </div>
          )}
          <div
            className="h-[120px] px-4 bg-white rounded-[1.25rem] border-4 border-[#e9d5ff] w-full flex items-center justify-center"
            style={{ boxShadow: "5px 5px 0px #fce7f3, 10px 10px 0px #ddd6fe" }}
          >
            {phase === "waiting" || !roomState?.currentMovie ? (
              <span className="text-[#a78bfa] text-xl font-[family-name:var(--font-quicksand)] font-semibold">
                Préparation...
              </span>
            ) : phase === "round_result" && roundResult ? (
              <div className="flex flex-col items-center gap-2">
                <span
                  className={`font-[family-name:var(--font-fredoka)] font-semibold text-[1.25rem] ${getRoundResultColor(roundResult.winnerId, didIWinRound)}`}
                >
                  {getRoundResultText(roundResult.winnerId, didIWinRound)}
                </span>
                <span className="font-[family-name:var(--font-quicksand)] font-semibold text-xl text-[#7c3aed]">
                  {roundResult.correctAnswer}
                </span>
              </div>
            ) : (
              <span className="text-[3.5rem]">{roomState.currentMovie.emojis}</span>
            )}
          </div>
        </div>

        <div className="relative z-[1] mb-4">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Quel est ce film ?"
            value={guess}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={phase !== "playing" || !roomState?.currentMovie}
            className={isError ? "error" : ""}
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className="relative z-[1]">
          <Button
            onClick={handleSubmit}
            disabled={phase !== "playing" || !roomState?.currentMovie}
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}
