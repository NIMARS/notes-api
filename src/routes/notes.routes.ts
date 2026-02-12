import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { encodeCursor, decodeCursor } from '../utils/cursor.js';
import { Prisma } from '@prisma/client'
// Schemas
const StringOrArray = z.union([z.string(), z.array(z.string())])
  .transform(v => Array.isArray(v) ? v : v.split(',').map(s => s.trim()).filter(Boolean))

const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  tagsAny: StringOrArray.optional(),
  tagsAll: StringOrArray.optional(),
})

const NoteListResponse = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    content: z.string(),
    tags: z.array(z.string()).default([]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })),
  nextCursor: z.string().nullable(),
})

const NoteDTO = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strict();

const CreateNoteBody = z.object({
  title: z.string().min(1),          
  content: z.string().default(''),
  tags: z.array(z.string()).default([]),
})

const UpdateNoteBody = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
}).refine((v) => Object.keys(v).length > 0, 'Empty update');


export async function notesRoutes(app: FastifyInstance) {
  // List all notes :3

  const textArray = (xs: string[]) =>
    Prisma.sql`ARRAY[${Prisma.join(xs.map(x => Prisma.sql`${x}::text`))}]`;

  app.get(
    '/',
    { schema: { summary: 'List notes (cursor)', querystring: ListQuery, response: { 200: NoteListResponse } } },
    async (req) => {
      const { limit, cursor, tagsAny, tagsAll } = req.query as z.infer<typeof ListQuery>

      const whereClauses: Prisma.Sql[] = []

      if (tagsAny?.length) {
        whereClauses.push(Prisma.sql`jsonb_exists_any("tags", ${textArray(tagsAny)})`)
      }
      if (tagsAll?.length) {
        whereClauses.push(Prisma.sql`jsonb_exists_all("tags", ${textArray(tagsAll)})`)
      }

      const c = decodeCursor(cursor)
      if (c) {
        whereClauses.push(Prisma.sql`
        (
          "createdAt" < ${c.createdAt}::timestamp
          OR ("createdAt" = ${c.createdAt}::timestamp AND "id" < ${c.id}::uuid)
        )
      `)
      }

      const whereSql = whereClauses.length
        ? Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`
        : Prisma.empty

      type Row = {
        id: string
        title: string
        content: string
        tags: unknown
        createdAt: Date
        updatedAt: Date
      }

      const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
        SELECT "id","title","content","tags","createdAt","updatedAt"
        FROM "Note"
        ${whereSql}
        ORDER BY "createdAt" DESC, "id" DESC
        LIMIT ${limit}
      `)

      const items = rows.map((r: Row) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        tags: (r.tags as string[]) ?? [],
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))

      const last = rows.at(-1) ?? null
      const nextCursor = last
        ? encodeCursor({ createdAt: last.createdAt, id: last.id })
        : null

      return { items, nextCursor }
    }
  )

  // Create note
  app.post(
    '/',
    {
      schema: {
        summary: 'Create note',
        body: CreateNoteBody,
        response: { 201: NoteDTO },
      },
    },
    async (req, reply) => {
      const { title, content, tags } = req.body as z.infer<typeof CreateNoteBody>;
      const n = await prisma.note.create({ data: { title, content, tags } });
      return reply.code(201).send({
        ...n,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      });
    }
  );

  // Get one note  by id
  app.get(
    '/:id',
    {
      schema: {
        summary: 'Get note',
        params: z.object({ id: z.string().uuid() }),
        response: { 200: NoteDTO },
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      const n = await prisma.note.findUnique({ where: { id } });
      if (!n) throw AppError.notFound('Note not found');
      return { ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() };
    }
  );

  // Update note by id
  app.patch(
    '/:id',
    {
      schema: {
        summary: 'Update note',
        params: z.object({ id: z.string().uuid() }),
        body: UpdateNoteBody,
        response: { 200: NoteDTO },
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      const data = req.body as z.infer<typeof UpdateNoteBody>;
      try {
        const n = await prisma.note.update({ where: { id }, data });
        return { ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() };
      } catch {
        throw AppError.notFound('Note not found');
      }
    }
  );

  // Delete by id
  app.delete(
    '/:id',
    {
      schema: {
        summary: 'Delete note',
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      try {
        await prisma.note.delete({ where: { id } });
      } catch {
        throw AppError.notFound('Note not found');
      }
      return reply.code(204).send();
    }
  );
}
