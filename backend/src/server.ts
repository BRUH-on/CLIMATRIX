import http from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { disconnectPrisma } from './prisma/client';

const app = createApp();
const server = http.createServer(app);

server.listen(env.PORT, () => {
  logger.info(
    `ClimaCore API listening on :${env.PORT}  [${env.NODE_ENV}]  /api/v1`,
  );
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutdown initiated');

  // Stop accepting new connections, then close cleanly.
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error closing HTTP server');
    }
    try {
      await disconnectPrisma();
      logger.info('Clean shutdown complete');
      process.exit(0);
    } catch (disconnectErr) {
      logger.error({ err: disconnectErr }, 'Error disconnecting Prisma');
      process.exit(1);
    }
  });

  // Force-kill if shutdown hangs (stuck connections, etc.).
  setTimeout(() => {
    logger.error('Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});

app.get("/api/v1/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "ClimaCore backend is running",
  });
});