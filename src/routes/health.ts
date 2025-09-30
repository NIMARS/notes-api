import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    '/health',
    {
      schema: {
        summary: 'Healthcheck',
        response: {
          200: z.object({ status: z.string() }), 
        },
      },
    },
    async () => ({ status: 'ok' as const })
  );
}