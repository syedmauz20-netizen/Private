import { strict as assert } from 'node:assert';
import { fixture, load } from './helpers/supabase-fixture.mjs';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
const { pg, sql } = await fixture();
process.env.DATABASE_URL = 'postgresql://synthetic.invalid/test';
const schema = load('db/schema.ts');
const queries = drizzle(pg, { schema });
const { getDb } = load('db/index.ts', { postgres: { default: () => sql }, 'drizzle-orm/postgres-js': { drizzle: () => ({}) }, './schema': schema });
const db = getDb();
const values = { id: 'one', name: 'Fixture', email: 'one@example.test', createdAt: '2026-11-05' };
try {
  await assert.rejects(() => db.batch([queries.insert(schema.members).values(values), queries.insert(schema.members).values(values)]), /unique/);
  assert.equal((await sql`SELECT * FROM members`).length, 0);
  await db.batch([queries.insert(schema.members).values(values), queries.update(schema.members).set({ name: 'Changed' }).where(eq(schema.members.id, 'one'))]);
  assert.equal((await sql`SELECT name FROM members`)[0].name, 'Changed');
  console.log('Production PostgreSQL batch helper checks passed with real compiled Drizzle SQL: rollback on failure and atomic commit.');
} finally { await pg.close(); }
