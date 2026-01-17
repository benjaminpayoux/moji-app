import { Suspense } from "react";
import { MultiplayerGame } from "@/components/multiplayer-game";

export default function MultiplayerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#fffbf5]">
          <span className="text-[#a78bfa] text-xl font-[family-name:var(--font-quicksand)] font-semibold">
            Chargement...
          </span>
        </div>
      }
    >
      <MultiplayerGame />
    </Suspense>
  );
}
