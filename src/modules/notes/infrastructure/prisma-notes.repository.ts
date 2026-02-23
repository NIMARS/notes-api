import { Prisma, type PrismaClient } from '@prisma/client';
import type { NotesRepository, ListNotesResult } from '../application/notes.repository.js';
import type { CreateNoteCommand, ListNotesQuery, UpdateNoteCommand } from '../domain/note.commands.js';
import type { NoteEntity } from '../domain/note.entity.js';
import { decodeCursor, encodeCursor } from '../../../utils/cursor.js';

type Row = {
  id: string;
  title: string;
  content: string;
  tags: unknown;
  createdAt: Date;
  updatedAt: Date;
};

const normalizeTags = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const toEntity = (r: Row): NoteEntity => ({
  id: r.id,
  title: r.title,
  content: r.content,
  tags: normalizeTags(r.tags),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export class PrismaNotesRepository implements NotesRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(query: ListNotesQuery): Promise<ListNotesResult> {
    const { limit, cursor, tagsAny, tagsAll } = query;
    const whereClauses: Prisma.Sql[] = [];

    const textArray = (xs: string[]) =>
      Prisma.sql`ARRAY[${Prisma.join(xs.map((x) => Prisma.sql`${x}::text`))}]`;

    if (tagsAny?.length)
      whereClauses.push(Prisma.sql`jsonb_exists_any("tags", ${textArray(tagsAny)})`);
    if (tagsAll?.length)
      whereClauses.push(Prisma.sql`jsonb_exists_all("tags", ${textArray(tagsAll)})`);

    const c = decodeCursor(cursor);
    if (c) {
      whereClauses.push(Prisma.sql`
        ("createdAt" < ${c.createdAt}::timestamp
        OR ("createdAt" = ${c.createdAt}::timestamp AND "id" < ${c.id}::uuid))
      `);
    }

    const whereSql = whereClauses.length
      ? Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT "id","title","content","tags","createdAt","updatedAt"
      FROM "Note"
      ${whereSql}
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT ${limit}
    `);

    const items = rows.map(toEntity);
    const last = rows.at(-1);
    const nextCursor = last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null;

    return { items, nextCursor };
  }

  async create(input: CreateNoteCommand): Promise<NoteEntity> {
    const n = await this.prisma.note.create({ data: input });
    return toEntity(n as unknown as Row);
  }

  async findById(id: string): Promise<NoteEntity | null> {
     const n = await this.prisma.note.findUnique({ where: { id } });
    if (!n) return null;
    return toEntity(n as unknown as Row);
  }

  async update(command: UpdateNoteCommand): Promise<NoteEntity | null> {
      try {
      const n = await this.prisma.note.update({ where: { id: command.id }, data: command.data, });
      return toEntity(n as unknown as Row);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') return null;
      throw e;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.note.delete({ where: { id } });
      return true;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') return false;
      throw e;
    }
  }
}
