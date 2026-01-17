const PLAYER_ID_KEY = "moji_player_id";
const ACTIVE_ROOM_KEY = "moji_active_room";

function generateUUID(): string {
  return crypto.randomUUID();
}

export function getOrCreatePlayerId(): string {
  if (typeof window === "undefined") {
    return generateUUID();
  }

  let playerId = sessionStorage.getItem(PLAYER_ID_KEY);
  if (!playerId) {
    playerId = generateUUID();
    sessionStorage.setItem(PLAYER_ID_KEY, playerId);
  }
  return playerId;
}

export function getActiveRoom(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return sessionStorage.getItem(ACTIVE_ROOM_KEY);
}

export function setActiveRoom(roomId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(ACTIVE_ROOM_KEY, roomId);
}

export function clearActiveRoom(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(ACTIVE_ROOM_KEY);
}
