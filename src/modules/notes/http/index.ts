import type { FastifyInstance } from 'fastify';
import { notesRoutes } from './notes.routes.js';

export type NotesHttpModuleOptions = {
  prefix?: string;
  protectWrites?: boolean;
};

export async function notesHttpModule(
  app: FastifyInstance,
  opts: NotesHttpModuleOptions = {},
) {
  await app.register(notesRoutes, {
    prefix: opts.prefix ?? '/notes',
    protectWrites: opts.protectWrites ?? true,
  });
}
