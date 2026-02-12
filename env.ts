import dotenv from 'dotenv';

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const DATABASE_URL = process.env.DATABASE_URL;

if (NODE_ENV === 'test') {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required for test environment.');
  }
  const urlLower = DATABASE_URL.toLowerCase();
  if (!urlLower.includes('test')) {
    throw new Error(
      'Test environment DATABASE_URL must point to a database or schema containing "test" in its name.'
    );
  }
}