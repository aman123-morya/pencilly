import type { MessageKind, Phase, PlayerDTO } from '../types.js';
import type { Player } from './Player.js';
import { ScoreManager } from './ScoreManager.js';
import { WordManager } from './WordManager.js';
import type { Room } from './Room.js';

export interface GameEngineCallbacks {
  onStateChange: () => void;
  onTimerTick: (remainingSeconds: number) => void;
  onRoundStart: (drawerId: string, wordOptions: string[], drawTime: number) => void;
  onSecretWord: (drawerId: string, word: string) => void;
  onRoundEnd: (word: string, scores: { playerId: string; points: number }[], nextDrawer?: string) => void;
  onGameOver: (winner: PlayerDTO, leaderboard: PlayerDTO[]) => void;
  onAnnounce: (text: string, kind?: MessageKind) => void;
  onGuessResult: (result: { correct: boolean; playerId: string; playerName: string; points: number }, toSocketId?: string) => void;
}

export class GameEngine {
  phase: Phase = 'lobby';
  round = 1;
  turnIndex = 0;
  order: string[] = [];
  drawerId: string | null = null;
  currentWord: string | null = null;
  wordOptions: string[] = [];
  usedWords = new Set<string>();
  guessed = new Set<string>();
  revealed = new Set<number>();
  endsAt: number | null = null;
  lastWord?: string;

  private chooseTimer: NodeJS.Timeout | null = null;
  private turnTimer: NodeJS.Timeout | null = null;
  private phaseTimer: NodeJS.Timeout | null = null;
  private isFinishingTurn = false;

  constructor(private room: Room, private callbacks: GameEngineCallbacks) {}

  clearTimers(): void {
    if (this.turnTimer) clearInterval(this.turnTimer);
    if (this.chooseTimer) clearTimeout(this.chooseTimer);
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.turnTimer = null;
    this.chooseTimer = null;
    this.phaseTimer = null;
  }

  startGame(): void {
    this.clearTimers();
    this.phase = 'choosing';
    const connectedPlayers = [...this.room.players.values()].filter(p => p.connected);
    this.order = connectedPlayers.map(p => p.id);
    this.round = 1;
    this.turnIndex = 0;
    this.drawerId = null;
    this.usedWords.clear();
    this.room.players.forEach(p => p.resetScore());
    this.callbacks.onAnnounce('Game on! Every player gets a turn to draw.');
    this.nextTurn();
  }

  nextTurn(): void {
    this.clearTimers();
    this.isFinishingTurn = false;
    this.currentWord = null;
    this.wordOptions = [];
    this.guessed.clear();
    this.revealed.clear();
    this.room.drawingManager.reset();
    this.endsAt = null;
    this.lastWord = undefined;

    const totalTurns = this.order.length * this.room.settings.rounds;
    while (
      this.turnIndex < totalTurns &&
      !this.room.players.get(this.order[this.turnIndex % this.order.length])?.connected
    ) {
      this.turnIndex++;
    }

    const connectedCount = [...this.room.players.values()].filter(p => p.connected).length;
    if (this.turnIndex >= totalTurns || connectedCount < 2) {
      this.finishGame();
      return;
    }

    this.round = Math.floor(this.turnIndex / this.order.length) + 1;
    this.drawerId = this.order[this.turnIndex % this.order.length];
    this.phase = 'choosing';

    this.wordOptions = WordManager.getWordOptions(
      this.room.settings.wordMode,
      this.room.settings.wordCount,
      this.usedWords
    );

    const drawer = this.room.players.get(this.drawerId);
    if (drawer) {
      this.callbacks.onRoundStart(
        this.drawerId,
        this.wordOptions,
        this.room.settings.drawTime
      );
    }

    this.callbacks.onAnnounce(`${drawer?.name || 'Someone'} is picking a word...`);
    this.callbacks.onStateChange();

    this.chooseTimer = setTimeout(() => {
      if (this.phase === 'choosing' && this.wordOptions[0]) {
        this.chooseWord(this.wordOptions[0]);
      }
    }, 16000);
  }

  chooseWord(word: string): void {
    if (this.phase !== 'choosing' || !this.wordOptions.includes(word)) return;
    this.clearTimers();
    this.currentWord = word;
    this.lastWord = word;
    this.usedWords.add(word);
    this.phase = 'drawing';
    this.endsAt = Date.now() + this.room.settings.drawTime * 1000;

    const drawer = this.drawerId ? this.room.players.get(this.drawerId) : undefined;
    if (drawer && this.drawerId) {
      this.callbacks.onSecretWord(this.drawerId, word);
    }

    this.callbacks.onAnnounce(`Let's draw! ${drawer?.name || 'The artist'} is up.`);
    this.callbacks.onStateChange();

    this.turnTimer = setInterval(() => {
      if (this.phase !== 'drawing') return;
      const remaining = Math.max(0, Math.ceil(((this.endsAt || 0) - Date.now()) / 1000));

      if (this.currentWord) {
        const wantedHints = WordManager.calculateWantedHints(
          this.room.settings.hints,
          this.room.settings.drawTime,
          remaining,
          this.currentWord,
          this.room.settings.wordMode
        );

        if (this.revealed.size < wantedHints) {
          const revealedIndex = WordManager.revealNextHint(this.currentWord, this.revealed);
          if (revealedIndex !== null) {
            this.callbacks.onStateChange();
          }
        }
      }

      this.callbacks.onTimerTick(remaining);
      if (remaining <= 0) {
        this.finishTurn();
      }
    }, 1000);
  }

  handleGuess(player: Player, text: string): { correct: boolean; points: number } {
    if (this.phase !== 'drawing' || !this.currentWord) {
      return { correct: false, points: 0 };
    }
    if (player.id === this.drawerId || this.guessed.has(player.id)) {
      return { correct: false, points: 0 };
    }

    if (WordManager.isMatch(text, this.currentWord)) {
      const remaining = Math.max(0, Math.ceil(((this.endsAt || 0) - Date.now()) / 1000));
      const isFirst = this.guessed.size === 0;
      const points = ScoreManager.calculateGuesserScore(remaining, this.room.settings.drawTime, isFirst);

      player.addScore(points);
      this.guessed.add(player.id);

      if (this.drawerId) {
        const artist = this.room.players.get(this.drawerId);
        if (artist) artist.addScore(ScoreManager.getDrawerBonus());
      }

      this.callbacks.onGuessResult({
        correct: true,
        playerId: player.id,
        playerName: player.name,
        points,
      });

      this.callbacks.onAnnounce(`${player.name} got it! +${points} points`, 'success');
      this.callbacks.onStateChange();

      // Check if all active guessers have now guessed
      const activeGuessers = [...this.room.players.values()].filter(
        p => p.connected && p.id !== this.drawerId
      );

      if (activeGuessers.length > 0 && activeGuessers.every(p => this.guessed.has(p.id))) {
        if (!this.phaseTimer) {
          this.phaseTimer = setTimeout(() => this.finishTurn(), 1700);
        }
      }

      return { correct: true, points };
    }

    return { correct: false, points: 0 };
  }

  finishTurn(): void {
    if (this.isFinishingTurn || (this.phase !== 'drawing' && this.phase !== 'choosing')) {
      return;
    }
    this.isFinishingTurn = true;
    this.clearTimers();

    this.phase = 'round_end';
    this.lastWord = this.currentWord || '(no word chosen)';
    this.endsAt = null;

    const scores = [...this.room.players.values()].map(p => ({
      playerId: p.id,
      points: p.score,
    }));

    const nextDrawerId = this.order.length > 0 ? this.order[(this.turnIndex + 1) % this.order.length] : undefined;

    this.callbacks.onRoundEnd(this.lastWord, scores, nextDrawerId);
    this.callbacks.onAnnounce(`The word was ${this.lastWord}.`);
    this.callbacks.onStateChange();

    this.phaseTimer = setTimeout(() => {
      this.turnIndex++;
      this.nextTurn();
    }, 3500);
  }

  finishGame(): void {
    this.clearTimers();
    this.phase = 'finished';
    this.drawerId = null;
    this.endsAt = null;

    const leaderboard = [...this.room.players.values()]
      .sort((a, b) => b.score - a.score)
      .map(p => p.toDTO());

    const winner = leaderboard[0] || {
      id: '',
      name: 'No winner',
      avatar: 0,
      score: 0,
      ready: false,
      connected: false,
    };

    this.callbacks.onGameOver(winner, leaderboard);
    this.callbacks.onStateChange();
  }

  resetToLobby(): void {
    this.clearTimers();
    this.phase = 'lobby';
    this.round = 1;
    this.turnIndex = 0;
    this.drawerId = null;
    this.currentWord = null;
    this.endsAt = null;
    this.lastWord = undefined;
    this.usedWords.clear();
    this.guessed.clear();
    this.revealed.clear();
    this.room.drawingManager.reset();
    this.room.messages = [];
    this.room.players.forEach(p => {
      p.resetScore();
      p.setReady(p.id === this.room.hostId);
    });
    this.callbacks.onStateChange();
  }

  handlePlayerDisconnect(playerId: string): void {
    if (this.drawerId === playerId && (this.phase === 'choosing' || this.phase === 'drawing')) {
      this.finishTurn();
    } else if (this.phase === 'drawing') {
      const activeGuessers = [...this.room.players.values()].filter(
        p => p.connected && p.id !== this.drawerId
      );
      if (activeGuessers.length > 0 && activeGuessers.every(p => this.guessed.has(p.id))) {
        this.finishTurn();
      }
    }
  }

  getWordMask(): string {
    if (!this.currentWord) return '';
    return WordManager.createWordMask(this.currentWord, this.revealed);
  }

  getRemainingSeconds(): number {
    return this.endsAt
      ? Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000))
      : this.room.settings.drawTime;
  }
}
