import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { WORDS } from './words.js';
import { RoomManager } from './models/RoomManager.js';
import { MessageHandler } from './socket/MessageHandler.js';

export const app = express();
const allowedOrigin = process.env.CLIENT_ORIGIN;
app.use(cors({ origin: allowedOrigin ? allowedOrigin.split(',') : true }));
app.use(express.json());

export const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: { origin: allowedOrigin ? allowedOrigin.split(',') : true },
  maxHttpBufferSize: 100_000,
});

export const roomManager = new RoomManager();
export const messageHandler = new MessageHandler(io, roomManager);

// HTTP Endpoints
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'pencilly-api',
    rooms: roomManager.count(),
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/api/config', (_req, res) => {
  res.json({
    maxPlayers: { min: 2, max: 20, default: 8 },
    rounds: { min: 2, max: 10, default: 3 },
    drawTime: { min: 15, max: 240, default: 80 },
    wordCount: { min: 1, max: 5, default: 3 },
    hints: { min: 0, max: 5, default: 2 },
    wordModes: ['normal', 'hidden', 'combination'],
    version: '1.0.0',
  });
});

app.get('/api/rooms/public', (_req, res) => {
  res.json(roomManager.getPublicRooms());
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(String(req.params.roomId));
  if (!room) {
    res.status(404).json({ message: 'Room not found' });
    return;
  }
  res.json({
    id: room.id,
    name: room.name,
    visibility: room.visibility,
    playerCount: room.players.size,
    maxPlayers: room.settings.maxPlayers,
    phase: room.gameEngine.phase,
  });
});

// Socket.IO connection dispatch
io.on('connection', socket => {
  messageHandler.register(socket);
});

// Production Frontend Static File Serving
const dirname = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(dirname, '../../client/dist');
if (fs.existsSync(path.join(frontend, 'index.html'))) {
  app.use(express.static(frontend));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io')) {
      next();
      return;
    }
    res.sendFile(path.join(frontend, 'index.html'));
  });
}

const port = Number(process.env.PORT) || 4000;

const isMain = process.argv[1] && (
  process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js')
) && !process.argv.includes('--test');

if (isMain && process.env.NODE_ENV !== 'test') {
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Pencilly is running at http://localhost:${port}`);
    console.log(`${WORDS.length} drawing words ready`);
  });
}
