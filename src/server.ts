import { buildApp } from './app.js';
import { env } from './bootstrap/env.js';
import { closePrisma } from './db/prisma.js';

const start = async () => {
  const app = await buildApp();

  const close = async (signal: NodeJS.Signals) => {
    try {
      app.log.info({ signal }, 'Shutting down...');
      await app.close();
      await closePrisma();
      // Some time for logs to flush
      setTimeout(() => process.exit(0), 100).unref();
    } catch (e) {

      console.error('Graceful shutdown failed', e);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void close('SIGTERM'));
  process.on('SIGINT', () => void close('SIGINT'));

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on 0.0.0.0:${env.PORT}`);
  } catch (err) {
    app.log.error({ err }, 'Failed to start');
    process.exit(1);
  }
};

void start();
