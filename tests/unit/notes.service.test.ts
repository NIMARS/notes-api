import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotesService } from '../../src/modules/notes/application/notes.service.js';
import { AppError } from '../../src/errors/app-error.js';
import type { NotesRepository } from '../../src/modules/notes/application/notes.repository.js';
import type { CreateNoteCommand, ListNotesQuery, UpdateNoteCommand } from '../../src/modules/notes/domain/note.commands.js';
import type { ListNotesResult } from '../../src/modules/notes/application/notes.repository.js';
import type { NoteEntity } from '../../src/modules/notes/domain/note.entity.js';


const makeNote = (id = '11111111-1111-4111-8111-111111111111'): NoteEntity => ({
  id,
  title: 't',
  content: 'c',
  tags: ['a'],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

describe('NotesService', () => {
  const listMock = vi.fn();
  const createMock = vi.fn();
  const findByIdMock = vi.fn();
  const updateMock = vi.fn();
  const deleteMock = vi.fn();

  const repo: NotesRepository = {
    list: listMock as unknown as NotesRepository['list'],
    create: createMock as unknown as NotesRepository['create'],
    findById: findByIdMock as unknown as NotesRepository['findById'],
    update: updateMock as unknown as NotesRepository['update'],
    delete: deleteMock as unknown as NotesRepository['delete'],
  };

  const service = new NotesService(repo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list proxies to repo with same query', async () => {
    const query: ListNotesQuery = { limit: 20, tagsAny: ['a'] };
    const result: ListNotesResult = { items: [makeNote()], nextCursor: 'cursor' };
    listMock.mockResolvedValue(result);

    const actual = await service.list(query);

    expect(listMock).toHaveBeenCalledWith(query);
    expect(actual).toEqual(result);
  });

  it('create proxies to repo with same command', async () => {
    const command: CreateNoteCommand = { title: 'x', content: 'y', tags: ['a'] };
    const note = makeNote();
    createMock.mockResolvedValue(note);

    const actual = await service.create(command);

    expect(createMock).toHaveBeenCalledWith(command);
    expect(actual).toEqual(note);
  });

  it('getById throws AppError.notFound when repo returns null', async () => {
    findByIdMock.mockResolvedValue(null);

    await expect(service.getById('00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(AppError);
    await expect(service.getById('00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  });

  it('update throws AppError.notFound when repo returns null', async () => {
    const command: UpdateNoteCommand = { id: 'id-1', data: { title: 'new' } };
    updateMock.mockResolvedValue(null);

    await expect(service.update(command)).rejects.toBeInstanceOf(AppError);
    await expect(service.update(command)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    expect(updateMock).toHaveBeenCalledWith(command);
  });

  it('remove throws AppError.notFound when repo returns false', async () => {
    deleteMock.mockResolvedValue(false);

    await expect(service.remove('id-1')).rejects.toBeInstanceOf(AppError);
    await expect(service.remove('id-1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
    expect(deleteMock).toHaveBeenCalledWith('id-1');
  });
});
