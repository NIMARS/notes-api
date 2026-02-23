export type NoteDto = { id: string; title: string; content: string; tags: string[]; createdAt: string; updatedAt: string };
export type NoteListDto = { items: NoteDto[]; nextCursor: string | null };