import { randomUUID } from "crypto";

type RoomGameState = {
  currentMovieId: number;
  round: number;
  totalRounds: number;
  scores: Map<string, number>;
  roundAnswered: boolean;
  usedMovieIds: Set<number>;
};

export type Room = {
  id: string;
  players: Set<string>;
  state: RoomGameState;
  createdAt: Date;
};

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private waitingQueue: string[] = [];
  private playerToRoom: Map<string, string> = new Map();

  joinQueue(socketId: string): Room | null {
    if (this.waitingQueue.includes(socketId)) {
      return null;
    }

    if (this.waitingQueue.length > 0) {
      const opponentId = this.waitingQueue.shift()!;
      const room = this.createRoom([opponentId, socketId]);
      return room;
    }

    this.waitingQueue.push(socketId);
    return null;
  }

  leaveQueue(socketId: string): void {
    const index = this.waitingQueue.indexOf(socketId);
    if (index !== -1) {
      this.waitingQueue.splice(index, 1);
    }
  }

  isInQueue(socketId: string): boolean {
    return this.waitingQueue.includes(socketId);
  }

  private createRoom(playerIds: string[]): Room {
    const roomId = randomUUID();
    const room: Room = {
      id: roomId,
      players: new Set(playerIds),
      state: {
        currentMovieId: -1,
        round: 0,
        totalRounds: 10,
        scores: new Map(playerIds.map((id) => [id, 0])),
        roundAnswered: false,
        usedMovieIds: new Set(),
      },
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    playerIds.forEach((id) => this.playerToRoom.set(id, roomId));

    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByPlayer(socketId: string): Room | undefined {
    const roomId = this.playerToRoom.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  removePlayer(socketId: string): { room: Room; wasLastPlayer: boolean } | null {
    const roomId = this.playerToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players.delete(socketId);
    this.playerToRoom.delete(socketId);

    const wasLastPlayer = room.players.size === 0;
    if (wasLastPlayer) {
      this.rooms.delete(roomId);
    }

    return { room, wasLastPlayer };
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
      room.players.forEach((playerId) => {
        this.playerToRoom.delete(playerId);
      });
      this.rooms.delete(roomId);
    }
  }
}

export const roomManager = new RoomManager();
