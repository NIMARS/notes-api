import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.note.deleteMany();

  await prisma.note.createMany({
    data: [
      {
        id: crypto.randomUUID(),
        title: 'First note (1)',
        content: 'Hello world',
        tags: ['welcome', 'intro'],
      },
      {
        id: crypto.randomUUID(),
        title: 'Fastify tips (2)',
        content: 'Use pino and sensible',
        tags: ['fastify', 'backend', 'tips'],
      },
      {
        id: crypto.randomUUID(),
        title: 'Prisma tricks (3)',
        content: 'Composite cursors and GIN index',
        tags: ['prisma', 'db', 'index'],
      },
    ],
  });
}

main()
  .then(async () => {
    console.log('Seed completed');
  })
  .catch(async (e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
