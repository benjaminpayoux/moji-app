"use client";

import type { ReactNode } from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSocket";

const TIMER_DURATION = 20;
const REVEAL_DELAY = 2500;
const IS_DEV = process.env.NODE_ENV === "development";

type MovieData = { id: number; emojis: string };

function renderGameContent(
  isConnected: boolean,
  currentMovie: MovieData | null,
  showSuccess: boolean,
  showTimeout: boolean,
  revealedAnswer: string | null
): ReactNode {
  if (!isConnected || !currentMovie) {
    return (
      <span className="text-[#a78bfa] text-xl font-[family-name:var(--font-quicksand)] font-semibold">
        Connexion...
      </span>
    );
  }

  if (showSuccess) {
    return (
      <span className="font-[family-name:var(--font-fredoka)] font-semibold text-[1.5rem] text-[#10b981] animate-bounce-success">
        Bravo !
      </span>
    );
  }

  if (showTimeout) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="font-[family-name:var(--font-fredoka)] font-semibold text-[1.25rem] text-[#f87171]">
          Temps écoulé !
        </span>
        <span className="font-[family-name:var(--font-quicksand)] font-semibold text-xl text-[#7c3aed]">
          {revealedAnswer}
        </span>
      </div>
    );
  }

  return <span className="text-[3.5rem]">{currentMovie.emojis}</span>;
}

export function Game() {
  const {
    isConnected,
    currentMovie,
    connect,
    requestMovie,
    submitAnswer,
    reportTimeout,
    onAnswerResult,
  } = useSocket();

  const [guess, setGuess] = useState("");
  const [isError, setIsError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showTimeout, setShowTimeout] = useState(false);
  const [revealedAnswer, setRevealedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [isPaused, setIsPaused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasRequestedFirstMovieRef = useRef(false);
  const currentMovieIdRef = useRef<number | null>(null);

  currentMovieIdRef.current = currentMovie?.id ?? null;

  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(TIMER_DURATION);

    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (currentMovieIdRef.current !== null) {
            reportTimeout(currentMovieIdRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [reportTimeout]);

  useEffect(() => {
    onAnswerResult((result) => {
      if (result.correct) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setShowSuccess(true);
        setIsError(false);
        setGuess("");

        setTimeout(() => {
          setShowSuccess(false);
          setTimeLeft(TIMER_DURATION);
          requestMovie(currentMovieIdRef.current ?? undefined);
        }, 1200);
      } else if (result.answer) {
        setRevealedAnswer(result.answer);
        setShowTimeout(true);

        setTimeout(() => {
          setShowTimeout(false);
          setRevealedAnswer(null);
          setTimeLeft(TIMER_DURATION);
          setGuess("");
          setIsError(false);
          requestMovie(currentMovieIdRef.current ?? undefined);
        }, REVEAL_DELAY);
      } else {
        setIsError(true);
        inputRef.current?.select();
      }
    });

    connect();
  }, []);

  if (isConnected && !currentMovie && !hasRequestedFirstMovieRef.current) {
    hasRequestedFirstMovieRef.current = true;
    requestMovie();
  }

  if (
    isConnected &&
    currentMovie &&
    !showSuccess &&
    !showTimeout &&
    !timerRef.current
  ) {
    startTimer();
  }

  if (isConnected && currentMovie && !showSuccess && !showTimeout) {
    inputRef.current?.focus();
  }

  const handleSubmit = useCallback(() => {
    if (!currentMovie || !guess.trim()) return;
    submitAnswer(currentMovie.id, guess);
  }, [currentMovie, guess, submitAnswer]);

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

  return (
    <div className="flex h-screen items-center justify-center bg-[#fffbf5] overflow-hidden">
      <div className="game-container relative w-full max-w-[420px] px-6 py-8 bg-[#fffbf5] text-center">
        <div
          className="absolute -top-[15px] -left-[15px] w-[50px] h-[50px] bg-[#fcd34d] rounded-full opacity-50"
        />
        <div
          className="absolute -bottom-[10px] -right-[10px] w-[70px] h-[70px] bg-[#a78bfa] rounded-[1rem] rotate-[15deg] opacity-30"
        />
        <div
          className="absolute top-[30px] right-[40px] w-[35px] h-[35px] bg-[#f9a8d4] opacity-40"
          style={{ clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }}
        />
        <div
          className="absolute bottom-[60px] -left-[20px] w-[40px] h-[40px] bg-[#7dd3fc] rounded-[8px] -rotate-[10deg] opacity-40"
        />

        <h1 className="font-[family-name:var(--font-fredoka)] font-bold text-[3rem] text-[#7c3aed] mb-[0.3rem] relative z-[1]">
          Play<span className="text-[#ec4899]">Moji</span>
        </h1>
        <p className="font-[family-name:var(--font-quicksand)] font-semibold text-[1rem] text-[#a78bfa] mb-8 relative z-[1]">
          Devine. En emojis.
        </p>

        <div className="relative z-[1] mb-6">
          {isConnected && currentMovie && !showSuccess && !showTimeout && (
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
            {renderGameContent(isConnected, currentMovie, showSuccess, showTimeout, revealedAnswer)}
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
            disabled={showSuccess || showTimeout || !isConnected || !currentMovie}
            className={isError ? "error" : ""}
            autoComplete="off"
            autoFocus
          />
        </div>

        <div className="relative z-[1]">
          <Button
            onClick={handleSubmit}
            disabled={showSuccess || showTimeout || !isConnected || !currentMovie}
          >
            Valider
          </Button>
        </div>

      </div>

      {IS_DEV && (
        <button
          type="button"
          onClick={() => setIsPaused((p) => !p)}
          className="fixed bottom-4 right-4 px-3 py-2 text-sm bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 z-[9999]"
        >
          {isPaused ? "▶ Resume" : "⏸ Pause"}
        </button>
      )}
    </div>
  );
}
