import type { PlayerDTO } from '../types.js';

export class Player {
  readonly id: string;
  name: string;
  avatar: number;
  score: number;
  ready: boolean;
  connected: boolean;
  socketId: string;
  lastActivity: number;

  constructor(options: {
    id: string;
    name: string;
    avatar: number;
    socketId: string;
    ready?: boolean;
    connected?: boolean;
    score?: number;
  }) {
    this.id = options.id;
    this.name = Player.sanitizeName(options.name);
    this.avatar = Player.sanitizeAvatar(options.avatar);
    this.socketId = options.socketId;
    this.ready = options.ready ?? false;
    this.connected = options.connected ?? true;
    this.score = options.score ?? 0;
    this.lastActivity = Date.now();
  }

  static sanitizeName(raw: unknown): string {
    if (typeof raw !== 'string') return 'Player';
    const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 20);
    return cleaned.length >= 2 ? cleaned : 'Player';
  }

  static sanitizeAvatar(raw: unknown): number {
    const num = Number(raw);
    return Number.isFinite(num) ? Math.max(0, Math.min(7, Math.floor(num))) : 0;
  }

  addScore(points: number): number {
    if (Number.isFinite(points) && points > 0) {
      this.score += Math.round(points);
    }
    return this.score;
  }

  resetScore(): void {
    this.score = 0;
  }

  setReady(ready: boolean): void {
    this.ready = Boolean(ready);
    this.touch();
  }

  setConnected(connected: boolean, socketId?: string): void {
    this.connected = connected;
    if (socketId) this.socketId = socketId;
    this.touch();
  }

  touch(): void {
    this.lastActivity = Date.now();
  }

  toDTO(): PlayerDTO {
    return {
      id: this.id,
      name: this.name,
      avatar: this.avatar,
      score: this.score,
      ready: this.ready,
      connected: this.connected,
    };
  }
}
