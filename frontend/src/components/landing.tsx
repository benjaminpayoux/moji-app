"use client";

import type { ReactNode } from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { demoExamples, type DemoExample } from "@/lib/demo-examples";

type AnimationPhase = "idle" | "typing" | "result";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function renderDemoContent(
  isClient: boolean,
  isSuccess: boolean,
  isError: boolean,
  currentExample: DemoExample
): ReactNode {
  if (!isClient) {
    return <span className="text-[3.5rem]">&nbsp;</span>;
  }

  if (isSuccess) {
    return (
      <span className="font-[family-name:var(--font-fredoka)] font-semibold text-[1.5rem] text-[#10b981] animate-success-pulse">
        Bravo !
      </span>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 animate-error-shake">
        <span className="font-[family-name:var(--font-fredoka)] font-semibold text-[1.25rem] text-[#f87171]">
          Raté !
        </span>
        <span className="font-[family-name:var(--font-quicksand)] font-semibold text-xl text-[#7c3aed]">
          {currentExample.correctAnswer}
        </span>
      </div>
    );
  }

  return <span className="text-[3.5rem]">{currentExample.emojis}</span>;
}

export function Landing() {
  const router = useRouter();
  const [examples, setExamples] = useState<DemoExample[]>(demoExamples);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [phase, setPhase] = useState<AnimationPhase>("idle");
  const [currentText, setCurrentText] = useState("");
  const [isClient, setIsClient] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentExample = examples[exampleIndex];

  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback((callback: () => void, delay: number) => {
    clearTimeouts();
    timeoutRef.current = setTimeout(callback, delay);
  }, [clearTimeouts]);

  const startTyping = useCallback(() => {
    setPhase("typing");
    setCurrentText("");
    let charIndex = 0;
    const answer = currentExample.typedAnswer;

    const typeNextChar = () => {
      if (charIndex < answer.length) {
        setCurrentText(answer.slice(0, charIndex + 1));
        charIndex++;
        const delay = 80 + Math.random() * 40;
        timeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        timeoutRef.current = setTimeout(() => {
          setPhase("result");
          const resultDelay = currentExample.isCorrect ? 1500 : 2000;
          timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            setExampleIndex((prev) => (prev + 1) % examples.length);
            setPhase("idle");
            setCurrentText("");
          }, resultDelay);
        }, 300);
      }
    };

    typeNextChar();
  }, [currentExample, examples.length]);

  useEffect(() => {
    setExamples(shuffleArray(demoExamples));
    setIsClient(true);
  }, []);

  if (isClient && phase === "idle" && currentText === "" && !timeoutRef.current) {
    scheduleNext(startTyping, 1500);
  }

  const isSuccess = phase === "result" && currentExample.isCorrect;
  const isError = phase === "result" && !currentExample.isCorrect;

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

        <h1 className="font-[family-name:var(--font-fredoka)] font-bold text-[3rem] text-[#7c3aed] mb-[0.3rem] relative z-[1]">
          Play<span className="text-[#ec4899]">Moji</span>
        </h1>
        <p className="font-[family-name:var(--font-quicksand)] font-semibold text-[1rem] text-[#a78bfa] mb-8 relative z-[1]">
          Devine. En emojis.
        </p>

        <div className="relative z-[1] mb-6">
          <div
            className="h-[120px] px-4 bg-white rounded-[1.25rem] border-4 border-[#e9d5ff] w-full flex items-center justify-center"
            style={{ boxShadow: "5px 5px 0px #fce7f3, 10px 10px 0px #ddd6fe" }}
          >
            {renderDemoContent(isClient, isSuccess, isError, currentExample)}
          </div>
        </div>

        <div className="relative z-[1] mb-4">
          <Input
            type="text"
            placeholder="Quel est ce film ?"
            value={currentText}
            readOnly
            className={isError ? "error" : ""}
            autoComplete="off"
          />
        </div>

        <div className="relative z-[1]">
          <Button onClick={() => router.push("/mode")}>Jouer</Button>
        </div>
      </div>
    </div>
  );
}
