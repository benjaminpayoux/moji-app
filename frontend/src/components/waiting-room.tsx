"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useMultiplayerSocket } from "@/hooks/useMultiplayerSocket";

type WaitingStatus = "connecting" | "searching" | "found";

function renderStatusContent(status: WaitingStatus): ReactNode {
  switch (status) {
    case "connecting":
      return (
        <>
          <span className="text-[2rem]">🔌</span>
          <span className="font-[family-name:var(--font-quicksand)] font-semibold text-[1rem] text-[#7c3aed]">
            Connexion...
          </span>
        </>
      );
    case "searching":
      return (
        <>
          <div className="flex gap-2">
            <span className="text-[2rem] animate-bounce" style={{ animationDelay: "0ms" }}>🔍</span>
            <span className="text-[2rem] animate-bounce" style={{ animationDelay: "150ms" }}>👤</span>
            <span className="text-[2rem] animate-bounce" style={{ animationDelay: "300ms" }}>👤</span>
          </div>
          <span className="font-[family-name:var(--font-quicksand)] font-semibold text-[1rem] text-[#7c3aed]">
            Recherche d&apos;un adversaire...
          </span>
        </>
      );
    case "found":
      return (
        <>
          <span className="text-[2rem]">✅</span>
          <span className="font-[family-name:var(--font-quicksand)] font-semibold text-[1rem] text-[#10b981]">
            Adversaire trouvé !
          </span>
        </>
      );
  }
}

export function WaitingRoom() {
  const router = useRouter();
  const {
    isConnected,
    connect,
    disconnect,
    joinMatchmaking,
    leaveMatchmaking,
    onMatchFound,
  } = useMultiplayerSocket();

  const [status, setStatus] = useState<WaitingStatus>("connecting");
  const joinedRef = useRef(false);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (isConnected && !joinedRef.current) {
      joinedRef.current = true;
      setStatus("searching");
      joinMatchmaking();
    }
  }, [isConnected, joinMatchmaking]);

  useEffect(() => {
    onMatchFound((data: { roomId: string }) => {
      setStatus("found");
      router.push(`/game/multiplayer?roomId=${data.roomId}`);
    });
  }, [onMatchFound, router]);

  const cancelSearch = useCallback(() => {
    leaveMatchmaking();
    disconnect();
    router.push("/mode");
  }, [leaveMatchmaking, disconnect, router]);

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

        <h1 className="font-[family-name:var(--font-fredoka)] font-bold text-[3rem] text-[#7c3aed] mb-[0.3rem] relative z-1">
          Play<span className="text-[#ec4899]">Moji</span>
        </h1>
        <p className="font-[family-name:var(--font-quicksand)] font-semibold text-[1rem] text-[#a78bfa] mb-8 relative z-1">
          Mode Multijoueur
        </p>

        <div className="relative z-1 mb-6">
          <div
            className="h-[120px] px-4 bg-white rounded-[1.25rem] border-4 border-[#e9d5ff] w-full flex flex-col items-center justify-center gap-3"
            style={{ boxShadow: "5px 5px 0px #fce7f3, 10px 10px 0px #ddd6fe" }}
          >
            {renderStatusContent(status)}
          </div>
        </div>

        <div className="relative z-1">
          <Button variant="destructive" onClick={cancelSearch} disabled={status === "found"}>
            Annuler
          </Button>
        </div>
      </div>
    </div>
  );
}
