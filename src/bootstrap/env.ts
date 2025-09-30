import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z
    .string()
    .default('3000')
    .transform((v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0 || n >= 65536) throw new Error('PORT must be a valid port');
      return n;
    }),
  DATABASE_URL: z
    .string()
    .default('postgresql://notes:notes@localhost:5432/notes?schema=public'),
  SWAGGER_UI: z
    .string()
    .default('true')
    .transform((v) => v.toLowerCase() === 'true'),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
