import crypto from 'node:crypto';
import type { PublicRoomDTO, Settings, Visibility } from '../types.js';
import { Room } from './Room.js';
import type { GameEngineCallbacks } from './GameEngine.js';

export class RoomManager {
  private rooms = new Map<string, Room>();
  private orphanCleanup = new Map<string, NodeJS.Timeout>();

  generateRoomCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(options: {
    name: string;
    visibility: Visibility;
    settings: Settings;
    hostId: string;
    callbacks: GameEngineCallbacks;
    customCode?: string;
  }): Room {
    const id = options.customCode?.toUpperCase() || this.generateRoomCode();
    const room = new Room({
      id,
      name: options.name,
      visibility: options.visibility,
      settings: options.settings,
      hostId: options.hostId,
      callbacks: options.callbacks,
    });
    this.rooms.set(id, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  hasRoom(roomId: string): boolean {
    return this.rooms.has(roomId.toUpperCase());
  }

  removeRoom(roomId: string): void {
    const id = roomId.toUpperCase();
    this.cancelOrphanCleanup(id);
    const room = this.rooms.get(id);
    if (room) {
      room.cleanup();
      this.rooms.delete(id);
    }
  }

  getPublicRooms(): PublicRoomDTO[] {
    return [...this.rooms.values()]
      .filter(
        room =>
          room.visibility === 'public' &&
          room.gameEngine.phase === 'lobby' &&
          room.players.size < room.settings.maxPlayers
      )
      .map(room => ({
        id: room.id,
        name: room.name,
        playerCount: room.players.size,
        maxPlayers: room.settings.maxPlayers,
      }));
  }

  scheduleOrphanCleanup(roomId: string, timeoutMs = 45000): void {
    const id = roomId.toUpperCase();
    if (this.orphanCleanup.has(id)) return;

    this.orphanCleanup.set(
      id,
      setTimeout(() => {
        const room = this.rooms.get(id);
        if (room && [...room.players.values()].every(p => !p.connected)) {
          this.removeRoom(id);
        }
        this.orphanCleanup.delete(id);
      }, timeoutMs)
    );
  }

  cancelOrphanCleanup(roomId: string): void {
    const id = roomId.toUpperCase();
    const timer = this.orphanCleanup.get(id);
    if (timer) {
      clearTimeout(timer);
      this.orphanCleanup.delete(id);
    }
  }

  count(): number {
    return this.rooms.size;
  }

  clearAll(): void {
    for (const [id] of this.rooms) {
      this.removeRoom(id);
    }
  }
}
