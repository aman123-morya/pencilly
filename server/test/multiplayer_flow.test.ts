process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { httpServer, roomManager } from '../src/index.js';
import type { DrawDataPayload, GuessResultDTO, Message, PlayerDTO, RoomStateDTO, SocketAck } from '../src/types.js';

function connectClient(url: string): Promise<ClientSocketType> {
  return new Promise((resolve, reject) => {
    const socket = ClientSocket(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function emitWithAck<T>(socket: ClientSocketType, event: string, payload: unknown): Promise<T> {
  return new Promise(resolve => {
    socket.emit(event, payload, (res: T) => resolve(res));
  });
}

function waitForEvent<T>(socket: ClientSocketType, event: string, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for event "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);

    const handler = (data: T) => {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(data);
    };

    socket.on(event, handler);
  });
}

function waitForEventMatching<T>(
  socket: ClientSocketType,
  event: string,
  predicate: (data: T) => boolean,
  timeoutMs = 8000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for event "${event}" matching condition`));
    }, timeoutMs);

    const handler = (data: T) => {
      if (predicate(data)) {
        clearTimeout(timer);
        socket.off(event, handler);
        resolve(data);
      }
    };

    socket.on(event, handler);
  });
}

describe('Full-Stack Multiplayer Flow Scenario (20 Steps)', () => {
  let baseUrl: string;
  let socketA: ClientSocketType;
  let socketB: ClientSocketType;
  let socketC: ClientSocketType;

  before(async () => {
    await new Promise<void>(resolve => {
      httpServer.listen(0, '127.0.0.1', () => {
        const address = httpServer.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    socketA?.disconnect();
    socketB?.disconnect();
    socketC?.disconnect();
    roomManager.clearAll();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  it('executes full 20-step multiplayer drawing and guessing cycle', async () => {
    // 1. Player A opens and creates room
    socketA = await connectClient(baseUrl);
    const sessionA = 'session-player-a';
    const createRes = await emitWithAck<SocketAck>(socketA, 'create_room', {
      hostName: 'Alice',
      avatar: 0,
      roomName: "Alice's Studio",
      visibility: 'public',
      settings: {
        maxPlayers: 5,
        rounds: 2,
        drawTime: 20,
        wordCount: 3,
        hints: 1,
        wordMode: 'normal',
      },
      sessionId: sessionA,
    });

    assert.equal(createRes.ok, true);
    assert.ok(createRes.roomId);
    const roomId = createRes.roomId;

    // 2. Player B joins using the room code
    socketB = await connectClient(baseUrl);
    const sessionB = 'session-player-b';
    const joinResB = await emitWithAck<SocketAck>(socketB, 'join_room', {
      roomId,
      playerName: 'Bob',
      avatar: 2,
      sessionId: sessionB,
    });
    assert.equal(joinResB.ok, true);

    // 3. Player C joins through invite URL (roomId)
    socketC = await connectClient(baseUrl);
    const sessionC = 'session-player-c';
    const joinResC = await emitWithAck<SocketAck>(socketC, 'join_room', {
      roomId,
      playerName: 'Charlie',
      avatar: 4,
      sessionId: sessionC,
    });
    assert.equal(joinResC.ok, true);

    // 4. All players appear in the lobby
    const room = roomManager.getRoom(roomId);
    assert.ok(room);
    assert.equal(room.players.size, 3);
    const players = [...room.players.values()].map(p => p.name);
    assert.deepEqual(players, ['Alice', 'Bob', 'Charlie']);

    // 5. Players ready up (Host Alice is auto-ready)
    assert.equal(room.players.get(sessionA)?.ready, true);
    await emitWithAck<SocketAck>(socketB, 'set_ready', { ready: true });
    await emitWithAck<SocketAck>(socketC, 'set_ready', { ready: true });

    assert.equal(room.players.get(sessionB)?.ready, true);
    assert.equal(room.players.get(sessionC)?.ready, true);

    // 6. Host starts the game
    const roundStartPromise = waitForEvent<{ drawerId: string; wordOptions: string[] }>(
      socketA,
      'round_start'
    );
    const startRes = await emitWithAck<SocketAck>(socketA, 'start_game', {});
    assert.equal(startRes.ok, true);

    // 7. Drawer (Alice) receives private word choices
    const roundStart = await roundStartPromise;
    assert.equal(roundStart.drawerId, sessionA);
    assert.equal(roundStart.wordOptions.length, 3);
    const chosenWord = roundStart.wordOptions[0];

    // Non-drawers did NOT receive secret word options
    assert.equal(room.getStateView().wordMask, '');

    // 8. Drawer selects a word
    const secretWordPromise = waitForEvent<{ word: string }>(socketA, 'secret_word');
    const wordRes = await emitWithAck<SocketAck>(socketA, 'word_chosen', { word: chosenWord });
    assert.equal(wordRes.ok, true);

    const secretData = await secretWordPromise;
    assert.equal(secretData.word, chosenWord);

    // 9. Other players see the word as blanks, never the secret word
    const stateView = room.getStateView();
    assert.ok(stateView.wordMask.includes('_'));
    assert.equal((stateView as Record<string, unknown>).currentWord, undefined);

    // 10. Drawer starts drawing
    const drawDataB = waitForEvent<DrawDataPayload>(socketB, 'draw_data');
    socketA.emit('draw_start', { x: 0.2, y: 0.3, color: '#f54e58', size: 6, tool: 'pen' });

    // 11. Other players see strokes in real time
    const startEvent = await drawDataB;
    assert.equal(startEvent.action, 'start');
    assert.ok(startEvent.stroke);
    assert.equal(startEvent.stroke.color, '#f54e58');

    // Drawer moves pointer
    const moveDataC = waitForEventMatching<DrawDataPayload>(socketC, 'draw_data', d => d.action === 'move');
    socketA.emit('draw_move', { x: 0.25, y: 0.35 });
    const moveEvent = await moveDataC;
    assert.equal(moveEvent.action, 'move');
    assert.ok(moveEvent.point);

    socketA.emit('draw_end');

    // 12. Player B guesses correctly and earns points
    const guessResultPromiseB = waitForEvent<GuessResultDTO>(socketB, 'guess_result');
    const guessResB = await emitWithAck<SocketAck>(socketB, 'guess', { text: chosenWord });
    assert.equal(guessResB.ok, true);

    const guessResultB = await guessResultPromiseB;
    assert.equal(guessResultB.correct, true);
    assert.equal(guessResultB.playerId, sessionB);
    assert.ok(guessResultB.points > 100);

    // 13. Player C submits an incorrect guess
    const chatMsgPromise = waitForEvent<Message>(socketA, 'chat_message');
    const guessResC = await emitWithAck<SocketAck>(socketC, 'guess', { text: 'wrong guess' });
    assert.equal(guessResC.ok, true);

    const chatMsg = await chatMsgPromise;
    assert.equal(chatMsg.kind, 'guess');
    assert.equal(chatMsg.text, 'wrong guess');
    assert.equal(chatMsg.playerName, 'Charlie');

    // 14. Leaderboard updates: Player B has points, Drawer A earned drawer bonus (45), C has 0
    assert.ok(room.players.get(sessionB)!.score > 100);
    assert.equal(room.players.get(sessionA)!.score, 45);
    assert.equal(room.players.get(sessionC)!.score, 0);

    // 15. Player C guesses correctly too -> turn ends immediately
    const roundEndPromise = waitForEvent<{ word: string }>(socketA, 'round_end');
    await emitWithAck<SocketAck>(socketC, 'guess', { text: chosenWord });

    // 16. The round ends and reveals the completed word
    const roundEnd = await roundEndPromise;
    assert.equal(roundEnd.word, chosenWord);

    // 17. The next drawing turn starts (Bob's turn)
    const nextRoundStartPromise = waitForEvent<{ drawerId: string }>(socketB, 'round_start');
    const nextRoundStart = await nextRoundStartPromise;
    assert.equal(nextRoundStart.drawerId, sessionB);

    // 18. Configured rounds can be finished, or game can be completed
    room.gameEngine.finishGame();
    assert.equal(room.gameEngine.phase, 'finished');

    // 19. Winner and final scores appear
    const finalView = room.getStateView();
    assert.equal(finalView.phase, 'finished');
    assert.ok(finalView.players.length === 3);

    // 20. Host can restart the game (play_again)
    const playAgainRes = await emitWithAck<SocketAck>(socketA, 'play_again', {});
    assert.equal(playAgainRes.ok, true);
    assert.equal(room.gameEngine.phase, 'lobby');
    assert.equal(room.players.get(sessionA)!.score, 0);
    assert.equal(room.players.get(sessionB)!.score, 0);
  });
});
