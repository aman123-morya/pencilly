export type Screen = 'home' | 'create' | 'lobby' | 'game' | 'results';
export type Visibility = 'public' | 'private';
export type Phase = 'lobby' | 'choosing' | 'drawing' | 'round_end' | 'finished';
export type WordMode = 'normal' | 'hidden' | 'combination';
export type Point = { x: number; y: number; pressure?: number };
export type Tool = 'pen' | 'eraser';
export type Stroke = { id: string; color: string; size: number; tool: Tool; points: Point[] };
export type WordCategory = 'all' | 'animals' | 'objects' | 'food' | 'places';
export type Language = 'en' | 'es' | 'fr' | 'de';

export interface Settings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  wordMode: WordMode;
  wordCategory?: WordCategory;
  language?: Language;
}
export interface Player {
  id: string;
  name: string;
  avatar: number;
  score: number;
  ready: boolean;
  connected: boolean;
}
export interface Message {
  id: string;
  playerId?: string;
  playerName?: string;
  kind: 'guess' | 'chat' | 'success' | 'system' | 'broadcast';
  text: string;
  timestamp: number;
}
export interface RoomState {
  id: string;
  name: string;
  visibility: Visibility;
  settings: Settings;
  hostId: string;
  phase: Phase;
  players: Player[];
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
export const DEFAULT_SETTINGS: Settings = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  wordMode: 'normal',
  wordCategory: 'all',
  language: 'en',
};
export type SocketAck = { ok: boolean; message?: string; roomId?: string; playerId?: string };
export interface PublicRoom { id: string; name: string; playerCount: number; maxPlayers: number }
