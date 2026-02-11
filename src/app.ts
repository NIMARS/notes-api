import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { env } from './bootstrap/env.js';
import { buildLoggerOptions } from './logger/index.js';
import { registerErrorHandler } from './errors/handler.js';
import { healthRoutes } from './routes/health.js';
import { notesRoutes } from './routes/notes.routes.js';


import {
  ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
  jsonSchemaTransform,
} from 'fastify-type-provider-zod'

export async function buildApp() {

  const app = Fastify({
    logger: buildLoggerOptions(env.NODE_ENV),
    trustProxy: true,
    routerOptions: {
      ignoreTrailingSlash: true,
      querystringParser: (str: string) => {
        const params = new URLSearchParams(str)
        const out: Record<string, unknown> = Object.create(null)
    
        for (const [rawKey, v] of params) {
          const key = rawKey.endsWith('[]') ? rawKey.slice(0, -2) : rawKey
          const current = out[key]
          if (current === undefined) {
            out[key] = v
          } else if (Array.isArray(current)) {
            current.push(v)
          } else {
            out[key] = [current as string, v]
          }
        }
        return out
      },
    },
  }).withTypeProvider<ZodTypeProvider>()


  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(sensible);

  await app.register(swagger, {

    openapi: {
      info: { title: 'Notes API', version: '0.1.0' },
      servers: [{ url: 'http://localhost:' + env.PORT }],
    },
    transform: jsonSchemaTransform
  });


  if (env.SWAGGER_UI) {
    await app.register(swaggerUI, {
      routePrefix: '/docs',
      uiConfig: { docExpansion: 'list', deepLinking: true },
    });
  }
  await app.register(notesRoutes, { prefix: '/notes' });
  await app.register(healthRoutes);

  registerErrorHandler(app);
  return app;
}
