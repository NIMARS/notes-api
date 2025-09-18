import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | Error, _req: FastifyRequest, reply: FastifyReply) => {
    // Zod validation
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message, code: i.code }));
      return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'Invalid input', details });
    }

    // my domain errors
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send(err.toResponse());
    }

    const status = (err as FastifyError).statusCode ?? 500;
    const code = (err as FastifyError).code ?? 'INTERNAL_ERROR';
    const message =
      status >= 500 ? 'Internal Server Error' : (err as FastifyError).message || 'Request failed';

    if (status >= 500) {
      app.log.error({ err }, 'Unhandled error');
    } else {
      app.log.warn({ err }, 'Request error');
    }

    return reply.status(status).send({ code, message });
  });
}
