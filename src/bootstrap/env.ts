import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .default('3000')
    .transform((v) => Number(v))
    .refine((n) => Number.isInteger(n) && n > 0 && n < 65536, 'PORT must be a valid port'),
  DATABASE_URL: z
    .string()
    .default('postgresql://notes:notes@localhost:5432/notes?schema=public'),
  SWAGGER_UI: z
    .string()
    .optional()
    .transform((v) => (v ?? 'true').toLowerCase() === 'true'),
});

export type Env = z.infer<typeof EnvSchema> & { PORT: number; SWAGGER_UI: boolean };

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data as Env;
