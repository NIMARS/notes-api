import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest, FastifySchemaValidationError } from 'fastify'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError } from './app-error.js'


type ErrorBody = { error: string; message: string; reqId?: string; details?: unknown }
type ValidationContext = 'body' | 'headers' | 'params' | 'querystring'

type FastifyValidationError = FastifyError & {
  validation: FastifySchemaValidationError[];
  validationContext?: ValidationContext;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

const isFastifyValidationError = (err: unknown): err is FastifyValidationError =>
  isRecord(err) && Array.isArray((err as Record<string, unknown>).validation)

const isPrismaKnownRequestError = (err: unknown): err is Prisma.PrismaClientKnownRequestError =>
  err instanceof Prisma.PrismaClientKnownRequestError


export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((err: FastifyError | Error, req: FastifyRequest, reply: FastifyReply) => {
    // 1) Zod .parse
    if (err instanceof ZodError) {
      const details = err.issues.map(i => ({ path: i.path.join('.'), message: i.message, code: i.code }))
      const body: ErrorBody = { error: 'ValidationError', message: 'Invalid input', reqId: req.id, details }
      return reply.code(400).send(body)
    }

    // 2) Fastify/Ajv 
    if (isFastifyValidationError(err)) {
      const body: ErrorBody = {
        error: 'ValidationError',
        message: (err as FastifyError).message ?? 'Validation error',
        reqId: req.id,
        details: err.validation,
      }
      return reply.code(400).send(body)
    }


    // 3) Prisma: not found
    // 4) Prisma: unique conflict
    if (isPrismaKnownRequestError(err)) {
      if (err.code === 'P2025') {
        return reply.code(404).send({ error: 'NotFound', message: 'Resource not found', reqId: req.id })
      }
      if (err.code === 'P2002') {
        return reply.code(409).send({ error: 'Conflict', message: 'Unique constraint failed', reqId: req.id })
      }
    }


    // 5) Me domain errors
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: err.code, message: err.message, reqId: req.id })
    }

    // 6) other err
    const fe = err as FastifyError
    const status = fe.statusCode ?? 500
    const body: ErrorBody = {
      error: status >= 500 ? 'InternalServerError' : (fe.code ?? 'BadRequest'),
      message: status >= 500 ? 'Internal Server Error' : (fe.message || 'Request failed'),
      reqId: req.id,
    }
    if (status >= 500) app.log.error({ err }, 'Unhandled error')
    else app.log.warn({ err }, 'Request error')
    return reply.code(status).send(body)
  })



  // 404 unique
  app.setNotFoundHandler((req, reply) => {
    const body: ErrorBody = { error: 'NotFound', message: 'Route not found', reqId: req.id }
    reply.code(404).send(body)
  })
}

