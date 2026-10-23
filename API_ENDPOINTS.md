# Pencilly API & Socket.IO Contract

The browser connects to Socket.IO on the same origin as the API (or using the `VITE_SOCKET_URL` base URL when configured). The default Socket.IO path is `/socket.io/`.

---

## 1. HTTP Endpoints

| Method | Path | Response | Description |
| --- | --- | --- | --- |
| `GET` | `/api/health` | `{ ok: true, service: "pencilly-api", rooms: number, uptime: number }` | Health check & metrics |
| `GET` | `/api/config` | `{ maxPlayers: { min, max, default }, rounds: {...}, drawTime: {...}, wordCount: {...}, hints: {...}, wordModes: string[], version: "1.0.0" }` | Published game limits |
| `GET` | `/api/rooms/public` | `[{ id: "A7K3Q", name: "Friday night doodles", playerCount: 2, maxPlayers: 8 }]` | Public discoverable rooms |
| `GET` | `/api/rooms/:roomId` | `{ id: "A7K3Q", name: "...", visibility: "public", playerCount: 2, maxPlayers: 8, phase: "lobby" }` | Safe room info (404 if not found) |

---

## 2. Socket Acknowledgements & Session Tokens

Client requests that alter room or game state accept an acknowledgement callback:

```ts
socket.emit('join_room', { roomId: 'A7K3Q', playerName: 'Alex', avatar: 0, sessionId }, (response: SocketAck) => {
  // Success: { ok: true, roomId: 'A7K3Q', playerId: sessionId }
  // Failure: { ok: false, message: 'No room with that code. Double-check it?' }
});
```

- `sessionId`: A client-generated session token (stored in `sessionStorage`). If a player refreshes their browser or loses network connection momentarily, re-submitting this `sessionId` restores their identity, score, and drawing state.

---

## 3. Room & Lobby Events

### Client → Server

| Event | Payload | Description |
| --- | --- | --- |
| `create_room` | `{ hostName: string, avatar: number, roomName: string, visibility: 'public' \| 'private', settings: Settings, sessionId: string }` | Creates a new room and assigns host privileges. |
| `join_room` | `{ roomId: string, playerName: string, avatar: number, sessionId: string }` | Joins an existing room or reconnects an existing session. |
| `leave_room` | `{}` | Gracefully leaves the room and releases slot. |
| `set_ready` | `{ ready: boolean }` | Toggles player readiness (host is automatically ready). |
| `update_settings` | `{ settings?: Settings, roomName?: string, visibility?: 'public' \| 'private' }` | Host-only, lobby-only: updates room rules and metadata. |
| `start_game` | `{}` | Host-only: starts game when at least 2 connected players are ready. |

### Server → Client (Broadcast)

| Event | Payload | Description |
| --- | --- | --- |
| `player_joined` | `{ players: PlayerDTO[] }` | Broadcast to the room whenever a player joins or reconnects. |
| `player_left` | `{ playerId: string, players: PlayerDTO[] }` | Broadcast to the room whenever a player leaves or disconnects. |
| `game_state` | `RoomStateDTO` | Full sanitized snapshot of the room state. |

---

## 4. Game Turn Events

### Client → Server

| Event | Payload | Permissions | Description |
| --- | --- | --- | --- |
| `word_chosen` | `{ word: string }` | Current drawer in `choosing` phase | Selects the active secret word from offered choices. |
| `play_again` | `{}` | Host in `finished` phase | Resets player scores and returns the room to `lobby`. |

### Server → Client

| Event | Target | Payload | Description |
| --- | --- | --- | --- |
| `round_start` | Current drawer only | `{ drawerId: string, wordOptions: string[], drawTime: number }` | Sends word choices privately to the artist. |
| `secret_word` | Current drawer only | `{ word: string }` | Confirms the secret word to the artist after selection. |
| `timer_tick` | Entire room | `{ remainingSeconds: number }` | Broadcast every second during drawing turn. |
| `round_end` | Entire room | `{ word: string, scores: { playerId, points }[], nextDrawer?: string }` | Reveals completed word and turn scores. |
| `game_over` | Entire room | `{ winner: PlayerDTO, leaderboard: PlayerDTO[] }` | Broadcast when all rounds conclude. |

> **Security Note**: `game_state` never contains the secret word while a turn is active. Non-drawers receive `wordMask` (e.g. `_ _ _ _`). Only during `round_end` and `finished` is the word publicly exposed as `lastWord`.

---

## 5. Real-Time Drawing Events

Normalized coordinate space: `x` and `y` are floats between `0.0` and `1.0`.

### Client → Server (Drawer Only)

| Event | Payload | Description |
| --- | --- | --- |
| `draw_start` | `{ x: number, y: number, color: string, size: number, tool: 'pen' \| 'eraser' }` | Starts a new stroke at normalized coordinates. |
| `draw_move` | `{ x: number, y: number }` | Appends a point to the currently active stroke. |
| `draw_end` | `{}` | Finalizes the currently active stroke. |
| `draw_undo` | `{}` | Removes the drawer's most recent stroke. |
| `canvas_clear` | `{}` | Wipes all strokes from the canvas. |

### Server → Client

| Event | Target | Payload | Description |
| --- | --- | --- | --- |
| `draw_data` | Entire room | `{ action: 'start' \| 'move' \| 'end', stroke?: Stroke, strokeId?: string, point?: Point }` | Real-time stroke transmission. |
| `canvas_snapshot` | Entire room | `{ strokes: Stroke[] }` | Broadcast after `draw_undo` or `canvas_clear`. |

---

## 6. Guesses & Chat Events

### Client → Server

| Event | Payload | Description |
| --- | --- | --- |
| `guess` | `{ text: string }` | Submitted by non-drawer during `drawing` phase. Evaluated case-insensitively. |
| `chat` | `{ text: string }` | General room chat message. |

### Server → Client

| Event | Target | Payload | Description |
| --- | --- | --- | --- |
| `guess_result` | Guesser or Room | `{ correct: boolean, playerId: string, playerName: string, points: number }` | Emitted when a guess is evaluated. |
| `chat_message` | Entire room | `{ id: string, kind: 'guess' \| 'chat' \| 'success' \| 'system', text: string, playerId?: string, playerName?: string, timestamp: number }` | Broadcast to room chat log. |

---

## 7. Scoring Rules

When a player guesses correctly:
1. **Base points**: `100` points
2. **Time bonus**: `Math.round(150 * remainingSeconds / drawTime)`
3. **First-guess bonus**: `40` points (if first correct guesser of the turn)
4. **Drawer reward**: `45` points awarded to the artist for every correct guesser
