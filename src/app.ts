import Fastify   from 'fastify';
import sensible  from '@fastify/sensible';
import swagger   from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { env }   from './bootstrap/env.js';
import { buildLoggerOptions }   from './logger/index.js';
import { registerErrorHandler } from './errors/handler.js';
import { healthRoutes } from './routes/health.js';

export async function buildApp() {
  const app = Fastify({
    logger: buildLoggerOptions(env.NODE_ENV),
    trustProxy: true,
  });

  await app.register(sensible);

  await app.register(swagger, {   // OpenAPI

    openapi: {
      info: { title: 'Notes API', version: '0.1.0' },
      servers: [{ url: 'http://localhost:' + env.PORT }],
    },
  });

  if (env.SWAGGER_UI) {
    await app.register(swaggerUI, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: true },
    });
  }

  await app.register(healthRoutes);

  registerErrorHandler(app);

  return app;
}
