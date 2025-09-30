import { buildApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp()
  await app.ready()                     
}, 20000)

afterAll(async () => {
  if (app) await app.close()             
  await prisma.$disconnect()             
}, 20000);

beforeEach(async () => {   await prisma.$executeRawUnsafe('TRUNCATE TABLE "Note" RESTART IDENTITY CASCADE;');});
