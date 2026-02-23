import { z } from 'zod';
import { ErrorResponse } from '../../../errors/error-response.js';

export const protectedResponses = { 401: ErrorResponse, 403: ErrorResponse };

const StringOrArray = z.union([z.string(), z.array(z.string())]).transform((v) =>
  Array.isArray(v)
    ? v
    : v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
);

export const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  tagsAny: StringOrArray.optional(),
  tagsAll: StringOrArray.optional(),
});

export const NoteListResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      content: z.string(),
      tags: z.array(z.string()).default([]),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  nextCursor: z.string().nullable(),
});

export const NoteResponseSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    content: z.string(),
    tags: z.array(z.string()).default([]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const CreateBodySchema = z.object({
  title: z.string().min(1),
  content: z.string().default(''),
  tags: z.array(z.string()).default([]),
});

export const UpdateBodySchema = z
  .object({
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Empty update');