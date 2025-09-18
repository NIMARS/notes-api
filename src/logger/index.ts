import type { FastifyServerOptions } from 'fastify';
import { randomUUID } from 'node:crypto';

export function buildLoggerOptions(envName: string): FastifyServerOptions['logger'] {
  const isProd = envName === 'production';

  const redactPaths = [
    'req.headers.authorization',
    'req.headers.cookie',
    "res.headers['set-cookie']",
  ];

  return isProd
    ? {
        level: 'info',
        genReqId: () => randomUUID(),
        redact: { paths: redactPaths, remove: true },
      }
    : {
        level: 'debug',
        genReqId: () => randomUUID(),
        redact: { paths: redactPaths, remove: true },
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'SYS:standard',
            singleLine: false,
          },
        },
      };
}
