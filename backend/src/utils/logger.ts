import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'climacore-api', env: env.NODE_ENV },
  ...(env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname,service,env',
      },
    },
  }),
});

export type Logger = typeof logger;
