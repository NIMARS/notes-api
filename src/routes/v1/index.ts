import type { FastifyInstance } from 'fastify';
import { notesHttpModule } from '../../modules/notes/http/index.js';
import { healthRoutes } from '../health.js';

export async function v1Routes(app: FastifyInstance) {
  await notesHttpModule(app, { prefix: '/notes', protectWrites: true });
  await app.register(healthRoutes);
}
