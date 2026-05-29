import { io, type Socket } from 'socket.io-client';

const SOCKET_URL: string =
  ((import.meta as unknown as { env?: { VITE_API_URL?: string } }).env
    ?.VITE_API_URL ?? 'http://localhost:4000');

let socket: Socket | null = null;

/**
 * Lazily-constructed Socket.io client singleton.
 * Tries WebSocket first, falls back to long-polling automatically.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/realtime',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 10_000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
