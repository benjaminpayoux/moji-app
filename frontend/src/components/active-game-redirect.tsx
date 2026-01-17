"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getActiveRoom } from "@/lib/session";

export function ActiveGameRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const activeRoom = getActiveRoom();

    if (activeRoom && pathname !== "/game/multiplayer") {
      router.replace("/game/multiplayer");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
