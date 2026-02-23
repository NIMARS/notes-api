import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { prisma, closePrisma } from '../src/db/prisma.js';

const DEFAULT_COUNT = 3;
const DEFAULT_BATCH_SIZE = 1000;
const TAG_POOL = [
  'welcome',
  'intro',
  'fastify',
  'backend',
  'tips',
  'prisma',
  'db',
  'index',
  'api',
  'typescript',
  'node',
  'postgres',
];

const getArgValue = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg?.slice(prefix.length);
};

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Invalid number value "${value}"`);
  }
  return n;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`Invalid boolean value "${value}"`);
};

const buildTags = (index: number): string[] => {
  const length = 2 + (index % 3);
  const start = index % TAG_POOL.length;
  return Array.from({ length }, (_, offset) => TAG_POOL[(start + offset) % TAG_POOL.length]);
};

const buildNote = (index: number) => {
  const createdAt = new Date(Date.UTC(2025, 0, 1, 0, 0, index));
  return {
    id: randomUUID(),
    title: `Seed note #${index + 1}`,
    content: `Generated note ${index + 1} for performance checks.`,
    tags: buildTags(index),
    createdAt,
    updatedAt: createdAt,
  };
};

async function main() {
  const count = toPositiveInt(getArgValue('count') ?? process.env.SEED_COUNT, DEFAULT_COUNT);
  const batchSize = toPositiveInt(
    getArgValue('batch') ?? process.env.SEED_BATCH_SIZE,
    Math.min(DEFAULT_BATCH_SIZE, count)
  );
  const reset = parseBoolean(getArgValue('reset') ?? process.env.SEED_RESET, true);

  if (reset) {
    await prisma.note.deleteMany();
  }

  for (let offset = 0; offset < count; offset += batchSize) {
    const size = Math.min(batchSize, count - offset);
    const data = Array.from({ length: size }, (_, i) => buildNote(offset + i));
    await prisma.note.createMany({ data });

    const inserted = offset + size;
    if (inserted % 10000 === 0 || inserted === count) {
      console.log(`Inserted ${inserted}/${count} notes`);
    }
  }
}

main()
  .then(() => {
    console.log('Seed completed');
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePrisma();
  });
