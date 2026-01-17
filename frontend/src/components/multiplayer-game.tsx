"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMultiplayerSocket } from "@/hooks/useMultiplayerSocket";
import type { RoundResult, GameEndResult } from "@/types/socket";

const TIMER_DURATION = 15;

type GamePhase = "waiting" | "playing" | "round_result" | "game_end";

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
  const roomId = searchParams.get("roomId");

  const {
    isConnected,
    roomState,
    mySocketId,
    connect,
    disconnect,
    submitAnswer,
    reportTimeout,
    onRoundResult,
    onGameEnd,
    onOpponentLeft,
    onWrongAnswer,
  } = useMultiplayerSocket();

  const [guess, setGuess] = useState("");
  const [isError, setIsError] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [gameResult, setGameResult] = useState<GameEndResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [opponentLeft, setOpponentLeft] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(TIMER_DURATION);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          if (roomId && roomState?.currentMovie) {
            reportTimeout(roomId, roomState.currentMovie.id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer, reportTimeout, roomId, roomState?.currentMovie]);

  onRoundResult(
    useCallback(
      (result: RoundResult) => {
        clearTimer();
        setRoundResult(result);
        setPhase("round_result");
        setGuess("");
        setIsError(false);

        setTimeout(() => {
          setPhase("playing");
          setRoundResult(null);
        }, 2500);
      },
      [clearTimer]
    )
  );

  onGameEnd(
    useCallback(
      (result: GameEndResult) => {
        clearTimer();
        setGameResult(result);
        setPhase("game_end");
      },
      [clearTimer]
    )
  );

  onOpponentLeft(
    useCallback(() => {
      clearTimer();
      setOpponentLeft(true);
    }, [clearTimer])
  );

  onWrongAnswer(
    useCallback(() => {
      setIsError(true);
      inputRef.current?.select();
    }, [])
  );

  if (!initRef.current) {
    initRef.current = true;
    connect();
  }

  if (phase === "waiting" && roomState?.currentMovie && !timerRef.current) {
    setPhase("playing");
    startTimer();
  }

  if (phase === "playing" && roomState?.currentMovie && !timerRef.current) {
    startTimer();
  }

  const handleSubmit = useCallback(() => {
    if (!roomId || !roomState?.currentMovie || !guess.trim()) return;
    submitAnswer(roomId, roomState.currentMovie.id, guess);
  }, [roomId, roomState?.currentMovie, guess, submitAnswer]);

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
    disconnect();
    router.push("/mode");
  }, [disconnect, router]);

  const myScore = mySocketId ? roomState?.players.find((p) => p.id === mySocketId)?.score ?? 0 : 0;
  const opponent = roomState?.players.find((p) => p.id !== mySocketId);
  const opponentScore = opponent?.score ?? 0;

  const didIWinRound = roundResult?.winnerId === mySocketId;
  const didIWinGame = gameResult?.winnerId === mySocketId;
  const isTie = gameResult && gameResult.winnerId === null;

  if (opponentLeft) {
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
                Adversaire déconnecté
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
                    {mySocketId ? gameResult.finalScores[mySocketId] ?? 0 : 0}
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
