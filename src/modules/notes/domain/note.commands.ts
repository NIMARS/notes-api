export type ListNotesQuery = { limit: number; cursor?: string; tagsAny?: string[]; tagsAll?: string[] };
export type CreateNoteCommand = { title: string; content: string; tags: string[] };
export type UpdateNoteCommand = { id: string; data: { title?: string; content?: string; tags?: string[] } };
