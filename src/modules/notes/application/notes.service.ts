import { AppError } from '../../../errors/app-error.js';
import type { CreateNoteCommand, ListNotesQuery, UpdateNoteCommand } from '../domain/note.commands.js';
import type { NoteEntity } from '../domain/note.entity.js';
import type { ListNotesResult, NotesRepository } from './notes.repository.js';

export class NotesService {
  constructor(private readonly repo: NotesRepository) { }

  list(query: ListNotesQuery): Promise<ListNotesResult> {
    return this.repo.list(query);
  }

  create(command: CreateNoteCommand): Promise<NoteEntity> {
    return this.repo.create(command);
  }


  async getById(id: string): Promise<NoteEntity> {
    const note = await this.repo.findById(id);
    if (!note) throw AppError.notFound('Note not found');
    return note;
  }

  async update(command: UpdateNoteCommand): Promise<NoteEntity> {
    const note = await this.repo.update(command);
    if (!note) throw AppError.notFound('Note not found');
    return note;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) throw AppError.notFound('Note not found');
  }
}
