import type { CreateNoteCommand, ListNotesQuery, UpdateNoteCommand } from '../domain/note.commands.js';
import type { NoteEntity } from '../domain/note.entity.js';

export type ListNotesResult = { items: NoteEntity[]; nextCursor: string | null };

export interface NotesRepository {
  list(query: ListNotesQuery): Promise<ListNotesResult>;
  create(command: CreateNoteCommand): Promise<NoteEntity>;
  findById(id: string): Promise<NoteEntity | null>;
  update(command: UpdateNoteCommand): Promise<NoteEntity | null>;
  delete(id: string): Promise<boolean>;
}
