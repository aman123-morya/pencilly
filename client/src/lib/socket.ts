import { io } from 'socket.io-client';

// Empty URL uses the current origin. Vite proxies /socket.io to the local server.
// Set VITE_SOCKET_URL only when the frontend and API are hosted separately.
const serverUrl = import.meta.env.VITE_SOCKET_URL?.trim() || undefined;
export const socket = io(serverUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 15,
  reconnectionDelay: 800,
});
