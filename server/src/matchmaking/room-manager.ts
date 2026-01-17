import { randomUUID } from "crypto";

const RECONNECT_TIMEOUT_SECONDS = 30;
const ROUND_DURATION_MS = 20000;
const LATENCY_BUFFER_MS = 150;
const TIME_SYNC_INTERVAL_MS = 5000;

export type PlayerConnection = {
  playerId: string;
  socketId: string | null;
  disconnectedAt: Date | null;
  intentionalLeave: boolean;
};

type RoomGameState = {
  currentMovieId: number;
  round: number;
  totalRounds: number;
  scores: Map<string, number>;
  roundAnswered: boolean;
  usedMovieIds: Set<number>;
  roundStartTime: number | null;
  roundEndTime: number | null;
  roundTimer: ReturnType<typeof setTimeout> | null;
  timeSyncInterval: ReturnType<typeof setInterval> | null;
};

export type Room = {
  id: string;
  players: Map<string, PlayerConnection>;
  state: RoomGameState;
  createdAt: Date;
};

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private waitingQueue: string[] = [];
  private playerToRoom: Map<string, string> = new Map();
  private socketToPlayer: Map<string, string> = new Map();
  private playerToSocket: Map<string, string> = new Map();
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  joinQueue(playerId: string): Room | null {
    if (this.waitingQueue.includes(playerId)) {
      return null;
    }

    if (this.waitingQueue.length > 0) {
      const opponentId = this.waitingQueue.shift()!;
      const room = this.createRoom([opponentId, playerId]);
      return room;
    }

    this.waitingQueue.push(playerId);
    return null;
  }

  leaveQueue(playerId: string): void {
    const index = this.waitingQueue.indexOf(playerId);
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
    }
  }

  isInQueue(playerId: string): boolean {
    return this.waitingQueue.includes(playerId);
  }

  registerSocket(socketId: string, playerId: string): void {
    this.socketToPlayer.set(socketId, playerId);
    this.playerToSocket.set(playerId, socketId);

    const roomId = this.playerToRoom.get(playerId);
    if (roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        const player = room.players.get(playerId);
        if (player) {
          player.socketId = socketId;
          player.disconnectedAt = null;
        }
      }
    }
  }

  getSocketIdByPlayer(playerId: string): string | undefined {
    return this.playerToSocket.get(playerId);
  }

  unregisterSocket(socketId: string): string | undefined {
    const playerId = this.socketToPlayer.get(socketId);
    this.socketToPlayer.delete(socketId);
    if (playerId) {
      this.playerToSocket.delete(playerId);
    }
    return playerId;
  }

  getPlayerIdBySocket(socketId: string): string | undefined {
    return this.socketToPlayer.get(socketId);
  }

  private createRoom(playerIds: string[]): Room {
    const roomId = randomUUID();
    const players = new Map<string, PlayerConnection>();

    playerIds.forEach((playerId) => {
      players.set(playerId, {
        playerId,
        socketId: null,
        disconnectedAt: null,
        intentionalLeave: false,
      });
    });

    const room: Room = {
      id: roomId,
      players,
      state: {
        currentMovieId: -1,
        round: 0,
        totalRounds: 10,
        scores: new Map(playerIds.map((id) => [id, 0])),
        roundAnswered: false,
        usedMovieIds: new Set(),
        roundStartTime: null,
        roundEndTime: null,
        roundTimer: null,
        timeSyncInterval: null,
      },
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    playerIds.forEach((id) => this.playerToRoom.set(id, roomId));

    return room;
  }

  setPlayerSocket(roomId: string, playerId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
      player.socketId = socketId;
      this.socketToPlayer.set(socketId, playerId);
    }
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByPlayer(playerId: string): Room | undefined {
    const roomId = this.playerToRoom.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  getRoomBySocket(socketId: string): Room | undefined {
    const playerId = this.socketToPlayer.get(socketId);
    if (!playerId) return undefined;
    return this.getRoomByPlayer(playerId);
  }

  handleDisconnect(
    socketId: string,
    onTimeout: (playerId: string, roomId: string) => void
  ): { room: Room; playerId: string; opponent: PlayerConnection | null } | null {
    const playerId = this.socketToPlayer.get(socketId);
    if (!playerId) return null;

    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player) return null;

    player.socketId = null;
    player.disconnectedAt = new Date();

    let opponent: PlayerConnection | null = null;
    for (const [id, conn] of room.players) {
      if (id !== playerId) {
        opponent = conn;
        break;
      }
    }

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(playerId);
      onTimeout(playerId, roomId);
    }, RECONNECT_TIMEOUT_SECONDS * 1000);

    this.disconnectTimers.set(playerId, timer);

    return { room, playerId, opponent };
  }

  handleReconnectTimeout(playerId: string, roomId: string): {
    room: Room;
    opponent: PlayerConnection | null;
  } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player) return null;

    player.intentionalLeave = true;

    let opponent: PlayerConnection | null = null;
    for (const [id, conn] of room.players) {
      if (id !== playerId) {
        opponent = conn;
        break;
      }
    }

    this.checkAndCloseRoom(roomId);

    return { room, opponent };
  }

  handleIntentionalLeave(playerId: string): {
    room: Room;
    opponent: PlayerConnection | null;
  } | null {
    const roomId = this.playerToRoom.get(playerId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player) return null;

    player.intentionalLeave = true;
    player.socketId = null;

    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    let opponent: PlayerConnection | null = null;
    for (const [id, conn] of room.players) {
      if (id !== playerId) {
        opponent = conn;
        break;
      }
    }

    this.checkAndCloseRoom(roomId);

    return { room, opponent };
  }

  attemptReconnect(
    playerId: string,
    roomId: string,
    socketId: string
  ): { success: true; room: Room; opponent: PlayerConnection | null } | { success: false; reason: "room_closed" | "player_not_found" | "invalid_room" } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, reason: "room_closed" };
    }

    const player = room.players.get(playerId);
    if (!player) {
      return { success: false, reason: "player_not_found" };
    }

    if (player.intentionalLeave) {
      return { success: false, reason: "room_closed" };
    }

    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    player.socketId = socketId;
    player.disconnectedAt = null;
    this.socketToPlayer.set(socketId, playerId);

    let opponent: PlayerConnection | null = null;
    for (const [id, conn] of room.players) {
      if (id !== playerId) {
        opponent = conn;
        break;
      }
    }

    return { success: true, room, opponent };
  }

  private checkAndCloseRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    let allLeft = true;
    for (const [, player] of room.players) {
      if (!player.intentionalLeave) {
        allLeft = false;
        break;
      }
    }

    if (allLeft) {
      this.deleteRoom(roomId);
      return true;
    }

    return false;
  }

  recordCorrectAnswer(roomId: string, playerId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.state.roundAnswered) return false;

    room.state.roundAnswered = true;
    const currentScore = room.state.scores.get(playerId) || 0;
    room.state.scores.set(playerId, currentScore + 1);

    return true;
  }

  prepareNextRound(roomId: string, movieId: number): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.state.round++;
    room.state.roundAnswered = false;
    room.state.currentMovieId = movieId;
    room.state.usedMovieIds.add(movieId);

    return room.state.round <= room.state.totalRounds;
  }

  markRoundAnswered(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.state.roundAnswered = true;
    }
  }

  startRoundTimer(roomId: string, onTimeout: () => void): { endTime: number; durationMs: number } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    this.clearRoundTimer(roomId);

    const now = Date.now();
    room.state.roundStartTime = now;
    room.state.roundEndTime = now + ROUND_DURATION_MS;

    room.state.roundTimer = setTimeout(() => {
      if (room.state.roundTimer) {
        room.state.roundTimer = null;
        if (!room.state.roundAnswered) {
          onTimeout();
        }
      }
    }, ROUND_DURATION_MS + LATENCY_BUFFER_MS);

    return { endTime: room.state.roundEndTime, durationMs: ROUND_DURATION_MS };
  }

  clearRoundTimer(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.state.roundTimer) {
      clearTimeout(room.state.roundTimer);
      room.state.roundTimer = null;
    }
    room.state.roundStartTime = null;
    room.state.roundEndTime = null;
  }

  startTimeSync(roomId: string, callback: (remainingMs: number) => void): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.clearTimeSync(roomId);

    room.state.timeSyncInterval = setInterval(() => {
      if (room.state.roundEndTime && !room.state.roundAnswered) {
        const remaining = Math.max(0, room.state.roundEndTime - Date.now());
        callback(remaining);
      }
    }, TIME_SYNC_INTERVAL_MS);
  }

  clearTimeSync(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.state.timeSyncInterval) {
      clearInterval(room.state.timeSyncInterval);
      room.state.timeSyncInterval = null;
    }
  }

  clearAllTimers(roomId: string): void {
    this.clearRoundTimer(roomId);
    this.clearTimeSync(roomId);
  }

  getRoundEndTime(roomId: string): number | null {
    const room = this.rooms.get(roomId);
    return room?.state.roundEndTime ?? null;
  }

  isGameOver(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return true;
    return room.state.round >= room.state.totalRounds;
  }

  getScores(roomId: string): Record<string, number> {
    const room = this.rooms.get(roomId);
    if (!room) return {};
    return Object.fromEntries(room.state.scores);
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.clearAllTimers(roomId);
      room.players.forEach((player) => {
        this.playerToRoom.delete(player.playerId);
        this.playerToSocket.delete(player.playerId);
        if (player.socketId) {
          this.socketToPlayer.delete(player.socketId);
        }
        const timer = this.disconnectTimers.get(player.playerId);
        if (timer) {
          clearTimeout(timer);
          this.disconnectTimers.delete(player.playerId);
        }
      });
      this.rooms.delete(roomId);
    }
  }

  getReconnectTimeoutSeconds(): number {
    return RECONNECT_TIMEOUT_SECONDS;
  }

  getConnectedPlayerIds(room: Room): string[] {
    const ids: string[] = [];
    for (const [playerId, conn] of room.players) {
      if (conn.socketId && !conn.intentionalLeave) {
        ids.push(playerId);
      }
    }
    return ids;
  }

  getPlayerSocketId(room: Room, playerId: string): string | null {
    return room.players.get(playerId)?.socketId || null;
  }

  isPlayerConnected(room: Room, playerId: string): boolean {
    const player = room.players.get(playerId);
    return player?.socketId !== null && !player?.intentionalLeave;
  }
}

export const roomManager = new RoomManager();
