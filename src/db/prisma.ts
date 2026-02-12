import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

export async function closePrisma() {
  await prisma.$disconnect()
  await pool.end()
}

export function isPrismaKnownRequestError(
  err: unknown
): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err && typeof (err as any).code === 'string'
}
