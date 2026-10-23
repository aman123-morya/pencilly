process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { io as ClientSocket, Socket as ClientSocketType } from 'socket.io-client';
import { httpServer, roomManager } from '../src/index.js';
import type { Message, SocketAck } from '../src/types.js';

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

describe('Security and Edge Cases', () => {
  let baseUrl: string;
  const openSockets: ClientSocketType[] = [];

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
    for (const s of openSockets) {
      s.disconnect();
    }
    roomManager.clearAll();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  it('enforces strict room isolation between simultaneous games', async () => {
    const s1 = await connectClient(baseUrl);
    const s2 = await connectClient(baseUrl);
    openSockets.push(s1, s2);

    // Create Room 1
    const res1 = await emitWithAck<SocketAck>(s1, 'create_room', {
      hostName: 'Room1Host',
      avatar: 0,
      roomName: 'First Room',
      visibility: 'public',
      sessionId: 'sess-room-1',
    });
    assert.equal(res1.ok, true);

    // Create Room 2
    const res2 = await emitWithAck<SocketAck>(s2, 'create_room', {
      hostName: 'Room2Host',
      avatar: 1,
      roomName: 'Second Room',
      visibility: 'public',
      sessionId: 'sess-room-2',
    });
    assert.equal(res2.ok, true);
    assert.notEqual(res1.roomId, res2.roomId);

    let room2ReceivedChat = false;
    s2.on('chat_message', (msg: Message) => {
      if (msg.text === 'Secret message in Room 1') {
        room2ReceivedChat = true;
      }
    });

    // Chat in Room 1
    const chatAck = await emitWithAck<SocketAck>(s1, 'chat', { text: 'Secret message in Room 1' });
    assert.equal(chatAck.ok, true);

    // Brief pause to ensure message was routed
    await new Promise(r => setTimeout(r, 200));

    // Room 2 must never receive Room 1 chat
    assert.equal(room2ReceivedChat, false);
  });

  it('rejects unauthorized drawings from non-drawers', async () => {
    const hostSocket = await connectClient(baseUrl);
    const guestSocket = await connectClient(baseUrl);
    openSockets.push(hostSocket, guestSocket);

    const createRes = await emitWithAck<SocketAck>(hostSocket, 'create_room', {
      hostName: 'DrawHost',
      avatar: 0,
      roomName: 'Draw Auth Room',
      visibility: 'private',
      sessionId: 'sess-draw-host',
    });

    await emitWithAck<SocketAck>(guestSocket, 'join_room', {
      roomId: createRes.roomId,
      playerName: 'DrawGuest',
      avatar: 2,
      sessionId: 'sess-draw-guest',
    });

    const room = roomManager.getRoom(createRes.roomId!);
    assert.ok(room);

    // Guest tries to draw before game even starts
    guestSocket.emit('draw_start', { x: 0.5, y: 0.5, color: '#000000', size: 5, tool: 'pen' });
    await new Promise(r => setTimeout(r, 100));

    assert.equal(room.drawingManager.getStrokes().length, 0);
  });

  it('handles player reconnection and recovers player state with sessionId', async () => {
    const s1 = await connectClient(baseUrl);
    const s2 = await connectClient(baseUrl);
    openSockets.push(s1, s2);

    const sessionId = 'persistent-session-42';
    const createRes = await emitWithAck<SocketAck>(s1, 'create_room', {
      hostName: 'OriginalHost',
      avatar: 3,
      roomName: 'Reconnect Room',
      visibility: 'public',
      sessionId,
    });
    const roomId = createRes.roomId!;

    // Player joins
    const joinRes = await emitWithAck<SocketAck>(s2, 'join_room', {
      roomId,
      playerName: 'Reconnector',
      avatar: 5,
      sessionId: 'guest-session-99',
    });
    assert.equal(joinRes.ok, true);

    const room = roomManager.getRoom(roomId);
    assert.ok(room);
    room.players.get('guest-session-99')!.addScore(180);

    // Guest simulates browser refresh: disconnects and connects new socket
    s2.disconnect();
    await new Promise(r => setTimeout(r, 100));

    const s2New = await connectClient(baseUrl);
    openSockets.push(s2New);

    const rejoinRes = await emitWithAck<SocketAck>(s2New, 'join_room', {
      roomId,
      playerName: 'Reconnector',
      avatar: 5,
      sessionId: 'guest-session-99',
    });
    assert.equal(rejoinRes.ok, true);

    // Verify player score was preserved
    const reconnectedPlayer = room.players.get('guest-session-99');
    assert.ok(reconnectedPlayer);
    assert.equal(reconnectedPlayer.connected, true);
    assert.equal(reconnectedPlayer.score, 180);
  });

  it('rate limits excessive chat message flooding', async () => {
    const s = await connectClient(baseUrl);
    openSockets.push(s);

    const createRes = await emitWithAck<SocketAck>(s, 'create_room', {
      hostName: 'RateLimitHost',
      avatar: 0,
      roomName: 'Rate Limit Room',
      visibility: 'private',
      sessionId: 'sess-rate-limit',
    });
    assert.equal(createRes.ok, true);

    // Fire 10 rapid messages
    const acks: SocketAck[] = [];
    for (let i = 0; i < 10; i++) {
      const ack = await emitWithAck<SocketAck>(s, 'chat', { text: `Spam ${i}` });
      acks.push(ack);
    }

    // At least some messages near the end must have been rejected by rate limiter
    const rateLimited = acks.filter(a => !a.ok && a.message?.includes('Slow down'));
    assert.ok(rateLimited.length > 0);
  });
});
