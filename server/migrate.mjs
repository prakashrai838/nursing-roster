import 'dotenv/config';
import pg from 'pg';
import { readFile } from 'node:fs/promises';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined, max: 2 });
try {
  await pool.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  console.log('Database schema is up to date.');
} finally { await pool.end(); }
