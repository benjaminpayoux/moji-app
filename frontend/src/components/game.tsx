"use client";

import { useState, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSocket";

const TIMER_DURATION = 15;
const REVEAL_DELAY = 2500;

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
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitializedRef = useRef(false);
  const hasRequestedFirstMovieRef = useRef(false);
  const currentMovieIdRef = useRef<number | null>(null);

  currentMovieIdRef.current = currentMovie?.id ?? null;

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(TIMER_DURATION);

    timerRef.current = setInterval(() => {
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

  if (!isInitializedRef.current) {
    isInitializedRef.current = true;

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
  }

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gradient-to-b from-slate-50 to-white p-4">
      <header className="text-center">
        <h1 className="font-mono text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          MOJI
        </h1>
        <p className="mt-1 text-sm text-slate-500">Devine le film</p>
      </header>

      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <p className="text-lg font-medium text-slate-600">
            Quel est ce film ?
          </p>
          {isConnected && currentMovie && !showSuccess && !showTimeout && (
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-mono text-lg font-bold transition-colors ${
                timeLeft <= 5
                  ? "bg-red-100 text-red-600"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {timeLeft}
            </div>
          )}
        </div>
        <div className="relative flex min-h-[140px] items-center justify-center">
          {!isConnected || !currentMovie ? (
            <div className="h-24 flex items-center">
              <span className="text-slate-400">Connexion...</span>
            </div>
          ) : showSuccess ? (
            <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
              <span className="text-5xl font-black text-emerald-500">
                Bravo !
              </span>
            </div>
          ) : showTimeout ? (
            <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
              <span className="text-3xl font-bold text-red-500">
                Temps écoulé !
              </span>
              <span className="text-2xl font-medium text-slate-700">
                {revealedAnswer}
              </span>
            </div>
          ) : (
            <p className="text-center text-7xl leading-relaxed sm:text-8xl md:text-9xl">
              {currentMovie.emojis}
            </p>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Ta réponse..."
          value={guess}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={showSuccess || showTimeout || !isConnected || !currentMovie}
          className={`h-14 text-center text-lg font-medium transition-all ${
            isError
              ? "border-red-500 ring-2 ring-red-500/20 focus-visible:border-red-500 focus-visible:ring-red-500/20"
              : ""
          }`}
          autoComplete="off"
          autoFocus
        />
        <Button
          onClick={handleSubmit}
          disabled={showSuccess || showTimeout || !isConnected || !currentMovie}
          size="lg"
          className="h-14 bg-slate-900 px-8 font-mono font-bold uppercase tracking-wide hover:bg-slate-800"
        >
          Valider
        </Button>
      </div>

      <p
        className={`h-6 font-medium text-red-500 transition-opacity ${
          isError && !showTimeout ? "opacity-100" : "opacity-0"
        }`}
      >
        Essaie encore !
      </p>
    </div>
  );
}
