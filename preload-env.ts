import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });
process.env.NODE_ENV = 'test';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL is required for test environment.');
}

const urlLower = dbUrl.toLowerCase();
if (!urlLower.includes('test')) {
  throw new Error(
    'Test environment DATABASE_URL must point to a database or schema containing "test" in its name.'
  );
}

console.log('✅ Test environment loaded: ', dbUrl);