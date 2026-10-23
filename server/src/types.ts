export type Phase = 'lobby' | 'choosing' | 'drawing' | 'round_end' | 'finished';
export type Visibility = 'public' | 'private';
export type WordMode = 'normal' | 'hidden' | 'combination';
export type Tool = 'pen' | 'eraser';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  color: string;
  size: number;
  tool: Tool;
  points: Point[];
}

export interface Settings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  wordMode: WordMode;
}

export interface PlayerDTO {
  id: string;
  name: string;
  avatar: number;
  score: number;
  ready: boolean;
  connected: boolean;
}

export type MessageKind = 'guess' | 'chat' | 'success' | 'system';

export interface Message {
  id: string;
  playerId?: string;
  playerName?: string;
  kind: MessageKind;
  text: string;
  timestamp: number;
}

export interface RoomStateDTO {
  id: string;
  name: string;
  visibility: Visibility;
  settings: Settings;
  hostId: string;
  phase: Phase;
  players: PlayerDTO[];
  round: number;
  turn: number;
  totalTurns: number;
  drawerId: string | null;
  endsAt: number | null;
  remainingSeconds: number;
  wordMask: string;
  wordLength: number;
  guessedIds: string[];
  strokes: Stroke[];
  messages: Message[];
  lastWord?: string;
}

export interface PublicRoomDTO {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
}

export interface SocketAck {
  ok: boolean;
  message?: string;
  roomId?: string;
  playerId?: string;
}

export interface DrawDataPayload {
  action: 'start' | 'move' | 'end';
  stroke?: Stroke;
  strokeId?: string;
  point?: Point;
}

export interface GuessResultDTO {
  correct: boolean;
  playerId: string;
  playerName: string;
  points: number;
}

export const DEFAULT_SETTINGS: Settings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordMode: 'normal',
};
