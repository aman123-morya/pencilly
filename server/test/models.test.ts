import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Player } from '../src/models/Player.js';
import { ScoreManager } from '../src/models/ScoreManager.js';
import { DrawingManager } from '../src/models/DrawingManager.js';
import { WordManager } from '../src/models/WordManager.js';
import { Room } from '../src/models/Room.js';
import { RoomManager } from '../src/models/RoomManager.js';

describe('Player Model', () => {
  it('sanitizes name and clamps avatar', () => {
    const player = new Player({
      id: 'p1',
      name: '   Cool   Artist   ',
      avatar: 99,
      socketId: 'sock-1',
    });
    assert.equal(player.name, 'Cool Artist');
    assert.equal(player.avatar, 7);
    assert.equal(player.ready, false);
    assert.equal(player.score, 0);

    const dto = player.toDTO();
    assert.equal(dto.id, 'p1');
    assert.equal(dto.name, 'Cool Artist');
    assert.equal(dto.avatar, 7);
  });

  it('updates score and ready status', () => {
    const player = new Player({ id: 'p2', name: 'Bob', avatar: 1, socketId: 'sock-2' });
    player.addScore(145);
    assert.equal(player.score, 145);
    player.addScore(55);
    assert.equal(player.score, 200);

    player.setReady(true);
    assert.equal(player.ready, true);

    player.resetScore();
    assert.equal(player.score, 0);
  });
});

describe('ScoreManager', () => {
  it('calculates score based on speed and first guess bonus', () => {
    // 80s draw time, 80s remaining -> full time bonus (150) + base (100) + first bonus (40) = 290
    const firstScore = ScoreManager.calculateGuesserScore(80, 80, true);
    assert.equal(firstScore, 290);

    // 80s draw time, 40s remaining -> half time bonus (75) + base (100) = 175
    const secondScore = ScoreManager.calculateGuesserScore(40, 80, false);
    assert.equal(secondScore, 175);

    // 0s remaining -> base only (100)
    const lateScore = ScoreManager.calculateGuesserScore(0, 80, false);
    assert.equal(lateScore, 100);

    assert.equal(ScoreManager.getDrawerBonus(), 45);
  });
});

describe('DrawingManager', () => {
  it('clamps coordinates to [0, 1] range', () => {
    const pt1 = DrawingManager.clampPoint({ x: -0.5, y: 1.5 });
    assert.deepEqual(pt1, { x: 0, y: 1 });

    const pt2 = DrawingManager.clampPoint({ x: 0.42, y: 0.88 });
    assert.deepEqual(pt2, { x: 0.42, y: 0.88 });

    assert.equal(DrawingManager.clampPoint(null), null);
    assert.equal(DrawingManager.clampPoint({ x: 'invalid', y: 0.5 }), null);
  });

  it('manages strokes, undo, and clear', () => {
    const dm = new DrawingManager();
    const stroke = dm.startStroke({ x: 0.1, y: 0.2 }, '#ff0000', 8, 'pen');
    assert.ok(stroke);
    assert.equal(stroke.color, '#ff0000');
    assert.equal(stroke.size, 8);
    assert.equal(stroke.tool, 'pen');

    const added = dm.addPoint({ x: 0.2, y: 0.3 });
    assert.ok(added);
    assert.equal(stroke.points.length, 2);

    const ended = dm.endStroke();
    assert.equal(ended?.id, stroke.id);

    // Add second stroke
    dm.startStroke({ x: 0.5, y: 0.5 }, '#00ff00', 4, 'eraser');
    dm.endStroke();
    assert.equal(dm.getStrokes().length, 2);

    // Undo removes second stroke
    const afterUndo = dm.undo();
    assert.equal(afterUndo.length, 1);
    assert.equal(afterUndo[0].id, stroke.id);

    // Clear removes all
    dm.clear();
    assert.equal(dm.getStrokes().length, 0);
  });
});

describe('WordManager', () => {
  it('masks secret words correctly', () => {
    const revealed = new Set<number>([1, 4]);
    const mask = WordManager.createWordMask('planet', revealed);
    assert.equal(mask, '_ l _ _ e _');

    const compoundMask = WordManager.createWordMask('paper plane', new Set([0, 7]));
    assert.equal(compoundMask, 'p _ _ _ _   _ l _ _ _');
  });

  it('safely reveals hints without crashing when all are revealed', () => {
    const word = 'cat';
    const revealed = new Set<number>();
    const idx1 = WordManager.revealNextHint(word, revealed);
    assert.ok(idx1 !== null && idx1 >= 0 && idx1 < 3);

    const idx2 = WordManager.revealNextHint(word, revealed);
    assert.ok(idx2 !== null && idx2 >= 0 && idx2 < 3);

    const idx3 = WordManager.revealNextHint(word, revealed);
    assert.ok(idx3 !== null && idx3 >= 0 && idx3 < 3);

    // When fully revealed, should return null without crashing
    const idx4 = WordManager.revealNextHint(word, revealed);
    assert.equal(idx4, null);
  });

  it('compares guesses case-insensitively and normalizes whitespace', () => {
    assert.equal(WordManager.isMatch('  CUPCAKE  ', 'cupcake'), true);
    assert.equal(WordManager.isMatch('fire   truck', 'Fire Truck'), true);
    assert.equal(WordManager.isMatch('wrong', 'right'), false);
  });

  it('generates combination mode words', () => {
    const options = WordManager.getWordOptions('combination', 3, new Set());
    assert.equal(options.length, 3);
    for (const opt of options) {
      assert.ok(opt.includes(' '));
    }
  });
});

describe('Room and RoomManager', () => {
  it('creates room and sanitizes settings within allowed boundaries', () => {
    const rm = new RoomManager();
    const room = rm.createRoom({
      name: 'My Custom Room',
      visibility: 'public',
      settings: {
        maxPlayers: 99, // clamped to 20
        rounds: 1, // clamped to 2
        drawTime: 500, // clamped to 240
        wordCount: 10, // clamped to 5
        hints: -1, // clamped to 0
        wordMode: 'normal',
      },
      hostId: 'h1',
      callbacks: {
        onStateChange: () => {},
        onTimerTick: () => {},
        onRoundStart: () => {},
        onSecretWord: () => {},
        onRoundEnd: () => {},
        onGameOver: () => {},
        onAnnounce: () => {},
        onGuessResult: () => {},
      },
    });

    assert.equal(room.settings.maxPlayers, 20);
    assert.equal(room.settings.rounds, 2);
    assert.equal(room.settings.drawTime, 240);
    assert.equal(room.settings.wordCount, 5);
    assert.equal(room.settings.hints, 0);

    // Room view never exposes secret word during turn
    room.gameEngine.currentWord = 'classified';
    const view = room.getStateView();
    assert.equal((view as Record<string, unknown>).currentWord, undefined);
    assert.equal(view.lastWord, undefined);
  });

  it('transfers host privileges when host leaves', () => {
    const rm = new RoomManager();
    const room = rm.createRoom({
      name: 'Host Test',
      visibility: 'private',
      settings: { maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hints: 2, wordMode: 'normal' },
      hostId: 'p1',
      callbacks: {
        onStateChange: () => {},
        onTimerTick: () => {},
        onRoundStart: () => {},
        onSecretWord: () => {},
        onRoundEnd: () => {},
        onGameOver: () => {},
        onAnnounce: () => {},
        onGuessResult: () => {},
      },
    });

    const p1 = new Player({ id: 'p1', name: 'Alice', avatar: 0, socketId: 's1', ready: true });
    const p2 = new Player({ id: 'p2', name: 'Bob', avatar: 1, socketId: 's2', ready: false });
    room.addPlayer(p1);
    room.addPlayer(p2);

    assert.equal(room.hostId, 'p1');

    room.removePlayer('p1', true);
    assert.equal(room.hostId, 'p2');
    assert.equal(p2.ready, true); // new host automatically set to ready
  });
});
