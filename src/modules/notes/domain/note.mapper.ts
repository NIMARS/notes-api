import type { NoteEntity } from './note.entity.js';
import type { NoteDto, NoteListDto } from './note.dto.js';

export const toNoteDto = (n: NoteEntity): NoteDto => ({ ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() });
export const toNoteListDto = (items: NoteEntity[], nextCursor: string | null): NoteListDto => ({ items: items.map(toNoteDto), nextCursor });
