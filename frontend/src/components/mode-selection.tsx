"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ModeSelection() {
  const router = useRouter();

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
          Choisis ton mode de jeu
        </p>

        <div className="relative z-[1] mb-6">
          <div
            className="h-[120px] px-4 bg-white rounded-[1.25rem] border-4 border-[#e9d5ff] w-full flex items-center justify-center"
            style={{ boxShadow: "5px 5px 0px #fce7f3, 10px 10px 0px #ddd6fe" }}
          >
            <span className="text-[3.5rem]">🎬🎮</span>
          </div>
        </div>

        <div className="relative z-[1] flex flex-col gap-4">
          <Button onClick={() => router.push("/game")}>
            Partie Rapide
          </Button>
          <Button variant="secondary" onClick={() => router.push("/game/waiting")}>
            Multijoueur
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            Retour
          </Button>
        </div>
      </div>
    </div>
  );
}
