import crypto from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type { Message, MessageKind, SocketAck } from '../types.js';
import { Player } from '../models/Player.js';
import { Room } from '../models/Room.js';
import { RoomManager } from '../models/RoomManager.js';
import { DrawingManager } from '../models/DrawingManager.js';
import type { GameEngineCallbacks } from '../models/GameEngine.js';

export class MessageHandler {
  private rateLimits = new Map<string, { lastChat: number[]; lastDraw: number }>();

  constructor(private io: Server, private roomManager: RoomManager) {}

  private respond(ack: unknown, result: SocketAck): void {
    if (typeof ack === 'function') {
      (ack as (res: SocketAck) => void)(result);
    }
  }

  private cleanText(value: unknown, maxLength: number): string {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
  }

  private checkChatRateLimit(socketId: string): boolean {
    const now = Date.now();
    let record = this.rateLimits.get(socketId);
    if (!record) {
      record = { lastChat: [], lastDraw: 0 };
      this.rateLimits.set(socketId, record);
    }
    record.lastChat = record.lastChat.filter(t => now - t < 2000);
    if (record.lastChat.length >= 6) {
      return false; // Exceeded 6 messages in 2 seconds
    }
    record.lastChat.push(now);
    return true;
  }

  private getSocketRoom(socket: Socket): { room: Room; player: Player } | null {
    const roomId = socket.data.roomId as string | undefined;
    const playerId = socket.data.playerId as string | undefined;
    if (!roomId || !playerId) return null;

    const room = this.roomManager.getRoom(roomId);
    if (!room) return null;

    const player = room.players.get(playerId);
    if (!player || player.socketId !== socket.id) return null;

    return { room, player };
  }

  private createRoomCallbacks(roomId: string): GameEngineCallbacks {
    return {
      onStateChange: () => {
        const room = this.roomManager.getRoom(roomId);
        if (room) {
          this.io.to(room.id).emit('game_state', room.getStateView());
        }
      },
      onTimerTick: (remainingSeconds: number) => {
        this.io.to(roomId).emit('timer_tick', { remainingSeconds });
      },
      onRoundStart: (drawerId: string, wordOptions: string[], drawTime: number) => {
        const room = this.roomManager.getRoom(roomId);
        const drawer = room?.players.get(drawerId);
        if (drawer) {
          this.io.to(drawer.socketId).emit('round_start', {
            drawerId,
            wordOptions,
            drawTime,
          });
        }
      },
      onSecretWord: (drawerId: string, word: string) => {
        const room = this.roomManager.getRoom(roomId);
        const drawer = room?.players.get(drawerId);
        if (drawer) {
          this.io.to(drawer.socketId).emit('secret_word', { word });
        }
      },
      onRoundEnd: (word: string, scores: { playerId: string; points: number }[], nextDrawer?: string) => {
        this.io.to(roomId).emit('round_end', { word, scores, nextDrawer });
      },
      onGameOver: (winner, leaderboard) => {
        this.io.to(roomId).emit('game_over', { winner, leaderboard });
      },
      onAnnounce: (text: string, kind: MessageKind = 'system') => {
        const room = this.roomManager.getRoom(roomId);
        if (!room) return;
        const message: Message = {
          id: crypto.randomUUID(),
          text,
          kind,
          timestamp: Date.now(),
        };
        room.addMessage(message);
        this.io.to(roomId).emit('chat_message', message);
      },
      onGuessResult: (result, toSocketId) => {
        if (toSocketId) {
          this.io.to(toSocketId).emit('guess_result', result);
        } else {
          this.io.to(roomId).emit('guess_result', result);
        }
      },
    };
  }

  private announce(room: Room, text: string, kind: MessageKind = 'system'): void {
    const message: Message = {
      id: crypto.randomUUID(),
      text,
      kind,
      timestamp: Date.now(),
    };
    room.addMessage(message);
    this.io.to(room.id).emit('chat_message', message);
  }

  private broadcastPlayers(room: Room): void {
    this.io.to(room.id).emit('player_joined', {
      players: [...room.players.values()].map(p => p.toDTO()),
    });
    this.io.to(room.id).emit('game_state', room.getStateView());
  }

  private removePlayerFromSocket(socket: Socket, permanent: boolean): void {
    const found = this.getSocketRoom(socket);
    if (!found) return;

    const { room, player } = found;
    socket.leave(room.id);
    socket.data.roomId = undefined;
    socket.data.playerId = undefined;

    const { roomEmpty } = room.removePlayer(player.id, permanent);

    this.io.to(room.id).emit('player_left', {
      playerId: player.id,
      players: [...room.players.values()].map(p => p.toDTO()),
    });

    if (room.players.size === 0) {
      this.roomManager.removeRoom(room.id);
      return;
    }

    if (roomEmpty || [...room.players.values()].every(p => !p.connected)) {
      this.roomManager.scheduleOrphanCleanup(room.id, 45000);
    }

    this.announce(room, `${player.name} left the room.`);
    this.io.to(room.id).emit('game_state', room.getStateView());
  }

  register(socket: Socket): void {
    socket.on('create_room', (payload: unknown, ack: unknown) => {
      if (this.getSocketRoom(socket)) {
        this.respond(ack, { ok: false, message: 'Leave your current room first.' });
        return;
      }

      const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
      const hostName = this.cleanText(body.hostName, 20);
      if (hostName.length < 2) {
        this.respond(ack, { ok: false, message: 'Your name needs at least two characters.' });
        return;
      }

      const playerId = this.cleanText(body.sessionId, 80) || crypto.randomUUID();
      const rawSettings = body.settings;
      const sanitizedSettings = Room.sanitizeSettings(rawSettings);
      const code = this.roomManager.generateRoomCode();

      const callbacks = this.createRoomCallbacks(code);
      const room = this.roomManager.createRoom({
        name: this.cleanText(body.roomName, 28) || `${hostName}'s room`,
        visibility: body.visibility === 'public' ? 'public' : 'private',
        settings: sanitizedSettings,
        hostId: playerId,
        callbacks,
        customCode: code,
      });

      const player = new Player({
        id: playerId,
        name: hostName,
        avatar: Player.sanitizeAvatar(body.avatar),
        socketId: socket.id,
        ready: true,
        connected: true,
      });

      room.addPlayer(player);
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.playerId = playerId;

      this.respond(ack, { ok: true, roomId: room.id, playerId });
      this.broadcastPlayers(room);
    });

    socket.on('join_room', (payload: unknown, ack: unknown) => {
      if (this.getSocketRoom(socket)) {
        this.respond(ack, { ok: false, message: 'Leave your current room first.' });
        return;
      }

      const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
      const roomId = this.cleanText(body.roomId, 12).toUpperCase();
      const room = this.roomManager.getRoom(roomId);

      if (!room) {
        this.respond(ack, { ok: false, message: 'No room with that code. Double-check it?' });
        return;
      }

      const playerId = this.cleanText(body.sessionId, 80) || crypto.randomUUID();
      const existing = room.players.get(playerId);

      if (!existing && room.gameEngine.phase !== 'lobby') {
        this.respond(ack, { ok: false, message: 'This game is already running.' });
        return;
      }

      if (!existing && room.players.size >= room.settings.maxPlayers) {
        this.respond(ack, { ok: false, message: 'That room is full.' });
        return;
      }

      const name = this.cleanText(body.playerName, 20);
      if (!existing && name.length < 2) {
        this.respond(ack, { ok: false, message: 'Add a name to join.' });
        return;
      }

      this.roomManager.cancelOrphanCleanup(room.id);

      let player: Player;
      if (existing) {
        existing.setConnected(true, socket.id);
        player = existing;
      } else {
        player = new Player({
          id: playerId,
          name,
          avatar: Player.sanitizeAvatar(body.avatar),
          socketId: socket.id,
          ready: false,
          connected: true,
        });
        room.addPlayer(player);
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.playerId = playerId;

      this.respond(ack, { ok: true, roomId, playerId });

      // If drawer reconnected during picking or drawing, restore private secret/options
      if (existing && room.gameEngine.drawerId === playerId) {
        if (room.gameEngine.phase === 'choosing' && room.gameEngine.wordOptions.length > 0) {
          socket.emit('round_start', {
            drawerId: playerId,
            wordOptions: room.gameEngine.wordOptions,
            drawTime: room.settings.drawTime,
          });
        } else if (room.gameEngine.phase === 'drawing' && room.gameEngine.currentWord) {
          socket.emit('secret_word', { word: room.gameEngine.currentWord });
        }
      }

      this.announce(room, existing ? `${player.name} is back!` : `${player.name} joined the room.`);
      this.broadcastPlayers(room);
    });

    socket.on('leave_room', (_payload: unknown, ack: unknown) => {
      this.removePlayerFromSocket(socket, true);
      this.respond(ack, { ok: true });
    });

    socket.on('set_ready', (payload: unknown, ack: unknown) => {
      const found = this.getSocketRoom(socket);
      if (!found || found.room.gameEngine.phase !== 'lobby') {
        this.respond(ack, { ok: false, message: 'Not in a lobby.' });
        return;
      }

      const { room, player } = found;
      player.setReady(player.id === room.hostId ? true : Boolean((payload as { ready?: boolean })?.ready));
      this.respond(ack, { ok: true });
      this.io.to(room.id).emit('game_state', room.getStateView());
    });

    socket.on('update_settings', (payload: unknown, ack: unknown) => {
      const found = this.getSocketRoom(socket);
      if (!found || found.player.id !== found.room.hostId) {
        this.respond(ack, { ok: false, message: 'Only the host can change settings.' });
        return;
      }

      const p = payload as { settings?: unknown; roomName?: unknown; visibility?: unknown } | undefined;
      const result = found.room.updateSettings(p?.settings, p?.roomName, p?.visibility);

      if (!result.ok) {
        this.respond(ack, { ok: false, message: result.message });
        return;
      }

      this.respond(ack, { ok: true });
      this.io.to(found.room.id).emit('game_state', found.room.getStateView());
    });

    socket.on('start_game', (_payload: unknown, ack: unknown) => {
      const found = this.getSocketRoom(socket);
      if (!found || found.player.id !== found.room.hostId) {
        this.respond(ack, { ok: false, message: 'Only the host can start a game.' });
        return;
      }

      const check = found.room.canStartGame();
      if (!check.ok) {
        this.respond(ack, { ok: false, message: check.message });
        return;
      }

      this.respond(ack, { ok: true });
      found.room.gameEngine.startGame();
    });

    socket.on('word_chosen', (payload: unknown, ack: unknown) => {
      const found = this.getSocketRoom(socket);
      if (
        !found ||
        found.room.gameEngine.drawerId !== found.player.id ||
        found.room.gameEngine.phase !== 'choosing'
      ) {
        this.respond(ack, { ok: false, message: 'Not your turn to choose.' });
        return;
      }

      const rawWord = (payload as { word?: string })?.word;
      const word = this.cleanText(rawWord, 40).toLowerCase();

      if (!found.room.gameEngine.wordOptions.includes(word)) {
        this.respond(ack, { ok: false, message: 'Pick one of the offered words.' });
        return;
      }

      this.respond(ack, { ok: true });
      found.room.gameEngine.chooseWord(word);
    });

    socket.on('guess', (payload: unknown, ack: unknown) => {
      const found = this.getSocketRoom(socket);
      if (!found || found.room.gameEngine.phase !== 'drawing') {
        this.respond(ack, { ok: false, message: 'Guessing has not started.' });
        return;
      }

      const { room, player } = found;
      if (player.id === room.gameEngine.drawerId) {
        this.respond(ack, { ok: false, message: 'The drawer cannot guess.' });
        return;
      }

      if (room.gameEngine.guessed.has(player.id)) {
        this.respond(ack, { ok: false, message: 'You already got it! Nice work.' });
        return;
      }

      if (!this.checkChatRateLimit(socket.id)) {
        this.respond(ack, { ok: false, message: 'Slow down a bit!' });
        return;
      }

      const text = this.cleanText((payload as { text?: string })?.text, 90);
      if (!text) {
        this.respond(ack, { ok: false, message: 'Type a guess first.' });
        return;
      }

      this.respond(ack, { ok: true });

      const outcome = room.gameEngine.handleGuess(player, text);
      if (!outcome.correct) {
        // Emit guess message into room chat
        const message: Message = {
          id: crypto.randomUUID(),
          playerId: player.id,
          playerName: player.name,
          kind: 'guess',
          text,
          timestamp: Date.now(),
        };
        room.addMessage(message);
        this.io.to(room.id).emit('chat_message', message);
        socket.emit('guess_result', {
          correct: false,
          playerId: player.id,
          playerName: player.name,
          points: 0,
        });
      }
    });

    socket.on('chat', (payload: unknown, ack: unknown) => {
      const found = this.getSocketRoom(socket);
      if (!found) {
        this.respond(ack, { ok: false, message: 'Join a room to chat.' });
        return;
      }

      if (!this.checkChatRateLimit(socket.id)) {
        this.respond(ack, { ok: false, message: 'Slow down a bit!' });
        return;
      }

      const text = this.cleanText((payload as { text?: string })?.text, 160);
      if (!text) {
        this.respond(ack, { ok: false, message: 'Write a message first.' });
        return;
      }

      const message: Message = {
        id: crypto.randomUUID(),
        playerId: found.player.id,
        playerName: found.player.name,
        kind: 'chat',
        text,
        timestamp: Date.now(),
      };
      found.room.addMessage(message);
      this.io.to(found.room.id).emit('chat_message', message);
      this.respond(ack, { ok: true });
    });

    socket.on('draw_start', (payload: unknown) => {
      const found = this.getSocketRoom(socket);
      if (
        !found ||
        found.room.gameEngine.phase !== 'drawing' ||
        found.room.gameEngine.drawerId !== found.player.id
      ) {
        return;
      }

      const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
      const point = DrawingManager.clampPoint(body);
      if (!point) return;

      const color = DrawingManager.sanitizeColor(body.color);
      const size = DrawingManager.sanitizeSize(body.size);
      const tool = DrawingManager.sanitizeTool(body.tool);

      const stroke = found.room.drawingManager.startStroke(point, color, size, tool);
      if (stroke) {
        this.io.to(found.room.id).emit('draw_data', { action: 'start', stroke });
      }
    });

    socket.on('draw_move', (payload: unknown) => {
      const found = this.getSocketRoom(socket);
      if (
        !found ||
        found.room.gameEngine.phase !== 'drawing' ||
        found.room.gameEngine.drawerId !== found.player.id
      ) {
        return;
      }

      const point = DrawingManager.clampPoint(payload);
      if (!point) return;

      const added = found.room.drawingManager.addPoint(point);
      if (added) {
        socket.to(found.room.id).emit('draw_data', {
          action: 'move',
          strokeId: added.strokeId,
          point: added.point,
        });
      }
    });

    socket.on('draw_end', () => {
      const found = this.getSocketRoom(socket);
      if (
        !found ||
        found.room.gameEngine.phase !== 'drawing' ||
        found.room.gameEngine.drawerId !== found.player.id
      ) {
        return;
      }

      const stroke = found.room.drawingManager.endStroke();
      if (stroke) {
        this.io.to(found.room.id).emit('draw_data', {
          action: 'end',
          strokeId: stroke.id,
          stroke,
        });
      }
    });

    socket.on('canvas_clear', () => {
      const found = this.getSocketRoom(socket);
      if (
        !found ||
        found.room.gameEngine.phase !== 'drawing' ||
        found.room.gameEngine.drawerId !== found.player.id
      ) {
        return;
      }

      found.room.drawingManager.clear();
      this.io.to(found.room.id).emit('canvas_snapshot', { strokes: [] });
    });

    socket.on('draw_undo', () => {
      const found = this.getSocketRoom(socket);
      if (
        !found ||
        found.room.gameEngine.phase !== 'drawing' ||
        found.room.gameEngine.drawerId !== found.player.id
      ) {
        return;
      }

      const remainingStrokes = found.room.drawingManager.undo();
      this.io.to(found.room.id).emit('canvas_snapshot', { strokes: remainingStrokes });
    });

    socket.on('play_again', (_payload: unknown, ack: unknown) => {
      const found = this.getSocketRoom(socket);
      if (
        !found ||
        found.player.id !== found.room.hostId ||
        found.room.gameEngine.phase !== 'finished'
      ) {
        this.respond(ack, { ok: false, message: 'Only the host can restart after the game.' });
        return;
      }

      found.room.gameEngine.resetToLobby();
      this.respond(ack, { ok: true });
    });

    socket.on('disconnect', () => {
      this.rateLimits.delete(socket.id);
      this.removePlayerFromSocket(socket, false);
    });
  }
}
