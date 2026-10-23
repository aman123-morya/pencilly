import type { Message, RoomStateDTO, Settings, Visibility, WordMode } from '../types.js';
import { Player } from './Player.js';
import { DrawingManager } from './DrawingManager.js';
import { GameEngine, GameEngineCallbacks } from './GameEngine.js';

export class Room {
  readonly id: string;
  name: string;
  visibility: Visibility;
  settings: Settings;
  hostId: string;
  players = new Map<string, Player>();
  messages: Message[] = [];
  readonly drawingManager: DrawingManager;
  readonly gameEngine: GameEngine;

  constructor(options: {
    id: string;
    name: string;
    visibility: Visibility;
    settings: Settings;
    hostId: string;
    callbacks: GameEngineCallbacks;
  }) {
    this.id = options.id;
    this.name = Room.sanitizeRoomName(options.name);
    this.visibility = options.visibility === 'public' ? 'public' : 'private';
    this.settings = Room.sanitizeSettings(options.settings);
    this.hostId = options.hostId;
    this.drawingManager = new DrawingManager();
    this.gameEngine = new GameEngine(this, options.callbacks);
  }

  static clamp(num: unknown, min: number, max: number, fallback: number): number {
    const value = Number(num);
    return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
  }

  static sanitizeRoomName(raw: unknown): string {
    if (typeof raw !== 'string') return 'Game Room';
    const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 28);
    return cleaned.length > 0 ? cleaned : 'Game Room';
  }

  static sanitizeSettings(input: unknown): Settings {
    const s = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
    const wordModeCandidates: WordMode[] = ['normal', 'hidden', 'combination'];
    const wordMode = wordModeCandidates.includes(String(s.wordMode) as WordMode)
      ? (s.wordMode as WordMode)
      : 'normal';

    return {
      maxPlayers: Room.clamp(s.maxPlayers, 2, 20, 8),
      rounds: Room.clamp(s.rounds, 2, 10, 3),
      drawTime: Room.clamp(s.drawTime, 15, 240, 80),
      wordCount: Room.clamp(s.wordCount, 1, 5, 3),
      hints: Room.clamp(s.hints, 0, 5, 2),
      wordMode,
    };
  }

  addPlayer(player: Player): void {
    this.players.set(player.id, player);
  }

  removePlayer(playerId: string, permanent: boolean): { player?: Player; roomEmpty: boolean } {
    const player = this.players.get(playerId);
    if (!player) return { roomEmpty: this.players.size === 0 };

    if (permanent) {
      this.players.delete(playerId);
    } else {
      player.setConnected(false);
    }

    if (this.hostId === playerId) {
      this.transferHost();
    }

    this.gameEngine.handlePlayerDisconnect(playerId);

    const activePlayers = [...this.players.values()].filter(p => p.connected);
    return { player, roomEmpty: this.players.size === 0 || activePlayers.length === 0 };
  }

  transferHost(): string | null {
    const connectedPlayers = [...this.players.values()].filter(p => p.connected);
    if (connectedPlayers.length > 0) {
      this.hostId = connectedPlayers[0].id;
      connectedPlayers[0].setReady(true);
      return this.hostId;
    }
    const remaining = [...this.players.keys()];
    this.hostId = remaining[0] || '';
    return this.hostId || null;
  }

  updateSettings(
    nextSettings: unknown,
    nextName?: unknown,
    nextVisibility?: unknown
  ): { ok: boolean; message?: string } {
    if (this.gameEngine.phase !== 'lobby') {
      return { ok: false, message: 'Settings can only be changed in the lobby.' };
    }

    const sanitized = Room.sanitizeSettings(nextSettings);
    if (sanitized.maxPlayers < this.players.size) {
      return { ok: false, message: 'Max players must be at least the current player count.' };
    }

    this.settings = sanitized;

    if (nextVisibility === 'public' || nextVisibility === 'private') {
      this.visibility = nextVisibility;
    }

    if (typeof nextName === 'string') {
      const cleaned = Room.sanitizeRoomName(nextName);
      if (cleaned) this.name = cleaned;
    }

    return { ok: true };
  }

  canStartGame(): { ok: boolean; message?: string } {
    if (this.gameEngine.phase !== 'lobby') {
      return { ok: false, message: 'Game has already started.' };
    }
    const connectedPlayers = [...this.players.values()].filter(p => p.connected);
    if (connectedPlayers.length < 2) {
      return { ok: false, message: 'You need at least two players.' };
    }
    if (connectedPlayers.some(p => !p.ready)) {
      return { ok: false, message: 'Ask everyone to ready up first.' };
    }
    return { ok: true };
  }

  addMessage(message: Message): void {
    this.messages.push(message);
    if (this.messages.length > 60) {
      this.messages = this.messages.slice(-60);
    }
  }

  getStateView(): RoomStateDTO {
    const totalTurns = this.gameEngine.order.length > 0
      ? this.gameEngine.order.length * this.settings.rounds
      : this.players.size * this.settings.rounds;

    return {
      id: this.id,
      name: this.name,
      visibility: this.visibility,
      settings: this.settings,
      hostId: this.hostId,
      phase: this.gameEngine.phase,
      players: [...this.players.values()].map(p => p.toDTO()),
      round: this.gameEngine.round,
      turn: this.gameEngine.turnIndex + 1,
      totalTurns,
      drawerId: this.gameEngine.drawerId,
      endsAt: this.gameEngine.endsAt,
      remainingSeconds: this.gameEngine.getRemainingSeconds(),
      wordMask: this.gameEngine.getWordMask(),
      wordLength: this.gameEngine.currentWord?.length || 0,
      guessedIds: [...this.gameEngine.guessed],
      strokes: this.drawingManager.getStrokes(),
      messages: this.messages,
      lastWord:
        this.gameEngine.phase === 'round_end' || this.gameEngine.phase === 'finished'
          ? this.gameEngine.lastWord
          : undefined,
    };
  }

  cleanup(): void {
    this.gameEngine.clearTimers();
  }
}
