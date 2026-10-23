import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { httpServer, roomManager } from '../src/index.js';

describe('Express HTTP API', () => {
  let baseUrl: string;

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
    roomManager.clearAll();
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  it('GET /api/health returns service status and room count', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json() as { ok: boolean; service: string; rooms: number; uptime: number };
    assert.equal(body.ok, true);
    assert.equal(body.service, 'pencilly-api');
    assert.equal(typeof body.rooms, 'number');
    assert.equal(typeof body.uptime, 'number');
  });

  it('GET /api/config returns configuration constraints', async () => {
    const res = await fetch(`${baseUrl}/api/config`);
    assert.equal(res.status, 200);
    const body = await res.json() as Record<string, unknown>;
    assert.ok(body.maxPlayers);
    assert.ok(body.rounds);
    assert.ok(body.drawTime);
    assert.ok(body.wordCount);
    assert.ok(body.hints);
    assert.ok(body.wordModes);
    assert.equal(body.version, '1.0.0');
  });

  it('GET /api/rooms/public and GET /api/rooms/:roomId return safe room details', async () => {
    // Initially no public rooms
    const resEmpty = await fetch(`${baseUrl}/api/rooms/public`);
    assert.equal(resEmpty.status, 200);
    const emptyList = await resEmpty.json() as unknown[];
    assert.equal(emptyList.length, 0);

    // Create a public room
    const room = roomManager.createRoom({
      name: 'Friday Night Doodles',
      visibility: 'public',
      settings: { maxPlayers: 6, rounds: 3, drawTime: 60, wordCount: 3, hints: 1, wordMode: 'normal' },
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

    // Check public list includes it
    const resList = await fetch(`${baseUrl}/api/rooms/public`);
    assert.equal(resList.status, 200);
    const list = await resList.json() as { id: string; name: string; maxPlayers: number }[];
    assert.equal(list.length, 1);
    assert.equal(list[0].id, room.id);
    assert.equal(list[0].name, 'Friday Night Doodles');
    assert.equal(list[0].maxPlayers, 6);

    // Check /api/rooms/:roomId
    const resDetail = await fetch(`${baseUrl}/api/rooms/${room.id}`);
    assert.equal(resDetail.status, 200);
    const detail = await resDetail.json() as { id: string; name: string; phase: string };
    assert.equal(detail.id, room.id);
    assert.equal(detail.name, 'Friday Night Doodles');
    assert.equal(detail.phase, 'lobby');

    // Check 404 for nonexistent room
    const res404 = await fetch(`${baseUrl}/api/rooms/NONEXISTENT`);
    assert.equal(res404.status, 404);
  });
});
