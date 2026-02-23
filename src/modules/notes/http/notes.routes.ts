import { ListQuerySchema, CreateBodySchema, UpdateBodySchema, NoteResponseSchema, NoteListResponseSchema } from './note.schemas.js'
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../../db/prisma.js';
import { authenticate, requireScopes } from '../../../auth/bearer-auth.js';
import { PrismaNotesRepository } from '../infrastructure/prisma-notes.repository.js';
import { NotesService } from '../application/notes.service.js';
import { ErrorResponse } from '../../../errors/error-response.js';

import { buildNotesHandlers } from './note.handlers.js';
const IdParamsSchema = z.object({ id: z.string().uuid() });

type NotesRoutesOptions = { protectWrites?: boolean };

export async function notesRoutes(app: FastifyInstance, opts: NotesRoutesOptions = {}) {
  const repo = new PrismaNotesRepository(prisma);
  const service = new NotesService(repo);
  const handlers = buildNotesHandlers(service);


  const postGuards = opts.protectWrites
    ? [authenticate, requireScopes(['notes:write'])]
    : undefined;
  const deleteGuards = opts.protectWrites
    ? [authenticate, requireScopes(['notes:delete'])]
    : undefined;

  app.get(
    '/',
    {
      schema: {
        summary: 'List notes (cursor)',
        querystring: ListQuerySchema,
        response: { 200: NoteListResponseSchema },
      },
    },
    handlers.list,
  );

  // Create note
  app.post(
    '/',
    {
      preHandler: postGuards,
      schema: {
        summary: 'Create note',
        body: CreateBodySchema,
        ...(opts.protectWrites ? { security: [{ bearerAuth: [] }] } : {}),
        response: opts.protectWrites
          ? {
            201: NoteResponseSchema,
            401: ErrorResponse,
            403: ErrorResponse,
          }
          : {
            201: NoteResponseSchema,
          },
      },
    },
    handlers.create,
  );

  // Get one note  by id
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Get note',
        params: IdParamsSchema,
        response: { 200: NoteResponseSchema },
      },
    },
    handlers.getById,
  );

  // Update note by id
  app.patch(
    '/:id',
    {
      schema: {
        summary: 'Update note',
        params: IdParamsSchema,
        body: UpdateBodySchema,
        response: { 200: NoteResponseSchema },
      },
    },
    handlers.update,
  );

  // Delete by id
  app.delete(
    '/:id',
    {
      preHandler: deleteGuards,
      schema: {
        summary: 'Delete note',
        params: IdParamsSchema,
        ...(opts.protectWrites ? { security: [{ bearerAuth: [] }] } : {}),
        response: opts.protectWrites
          ? {
            204: z.null(),
            401: ErrorResponse,
            403: ErrorResponse,
          }
          : {
            204: z.null(),
          },
      },
    },
    handlers.remove,
  );
}
