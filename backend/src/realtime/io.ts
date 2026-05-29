/**
 * Socket.io server singleton.
 *
 * - Mounted at `/realtime` (avoids clashing with `/api/v1`).
 * - On client connect, immediately emits the current AQI snapshot so the UI
 *   doesn't need a separate REST round-trip on first paint.
 * - `broadcastAqiUpdate(snapshot)` is called by the OpenAQ service whenever
 *   new readings land — pushes to every connected client.
 * - Falls back to long-polling automatically when WebSocket isn't available.
 */
import type { Server as HttpServer } from 'node:http';
import { Server as IOServer } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { AQISnapshot } from '../services/openaqService';

let io: IOServer | null = null;

export function initRealtime(httpServer: HttpServer): IOServer {
  if (io) return io;

  const corsOrigins =
    env.CORS_ORIGIN === '*'
      ? '*'
      : env.CORS_ORIGIN.split(',').map((s) => s.trim());

  io = new IOServer(httpServer, {
    path: '/realtime',
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.on('connection', async (socket) => {
    logger.info({ socketId: socket.id }, 'realtime client connected');

    // Send the current snapshot to the new client so it has data immediately.
    try {
      // Lazy-require to avoid a circular import at module load.
      const { getLatestPerCity } = await import(
        '../services/openaqService.js'
      ).catch(() => import('../services/openaqService'));
      const snapshot = await getLatestPerCity();
      socket.emit('aqi:snapshot', snapshot);
    } catch (err) {
      logger.warn(
        { err, socketId: socket.id },
        'Failed to send initial AQI snapshot to new client',
      );
    }

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'realtime client disconnected');
    });
  });

  logger.info({ path: '/realtime' }, 'Socket.io realtime server initialized');
  return io;
}

export function broadcastAqiUpdate(snapshot: AQISnapshot): void {
  if (!io) return;
  io.emit('aqi:update', snapshot);
}

export function getIO(): IOServer | null {
  return io;
}

export async function shutdownRealtime(): Promise<void> {
  if (!io) return;
  await new Promise<void>((resolve) => io!.close(() => resolve()));
  io = null;
}
