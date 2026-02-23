import type { FastifyReply, FastifyRequest } from 'fastify';
import type { NotesService } from '../application/notes.service.js';
import { toNoteDto, toNoteListDto } from '../domain/note.mapper.js';
import type {
  CreateNoteCommand,
  ListNotesQuery,
  UpdateNoteCommand,
} from '../domain/note.commands.js';

export const buildNotesHandlers = (service: NotesService) => ({
  list: async (req: FastifyRequest) => {
    const query = req.query as ListNotesQuery;
    const result = await service.list(query);
    return toNoteListDto(result.items, result.nextCursor);
  },

  create: async (req: FastifyRequest, reply: FastifyReply) => {
    const command = req.body as CreateNoteCommand;
    const note = await service.create(command);
    return reply.code(201).send(toNoteDto(note));
  },

  getById: async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    const note = await service.getById(id);
    return toNoteDto(note);
  },

  update: async (req: FastifyRequest) => {
    const { id } = req.params as { id: string };
    const data = req.body as UpdateNoteCommand['data'];
    const command: UpdateNoteCommand = { id, data };
    const note = await service.update(command);
    return toNoteDto(note);
  },

  remove: async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    await service.remove(id);
    return reply.code(204).send();
  },
});