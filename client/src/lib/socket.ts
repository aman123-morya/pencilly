import { io } from 'socket.io-client';

// Empty URL in dev uses the current origin (Vite proxies /socket.io to the local server).
// In production, defaults to the deployed Render backend if VITE_SOCKET_URL is not set.
const serverUrl = import.meta.env.VITE_SOCKET_URL?.trim() || (import.meta.env.PROD ? 'https://pencilly-server.onrender.com' : undefined);
export const socket = io(serverUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 15,
  reconnectionDelay: 800,
});
