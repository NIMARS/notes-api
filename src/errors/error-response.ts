import { z } from 'zod';

export const ErrorResponse = z.object({
  error: z.string(),
  message: z.string(),
  reqId: z.string().optional(),
  details: z.unknown().optional(),
});
