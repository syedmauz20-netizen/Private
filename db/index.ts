import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
let client: ReturnType<typeof postgres> | undefined;
export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  return client ??= postgres(url, { prepare: false, max: 3, ssl: 'require', idle_timeout: 20, connect_timeout: 10 });
}
export function getDb() {
  const client = database();
  const db = drizzle(client, { schema });
  return Object.assign(db, {
    async batch(queries: { toSQL(): { sql: string; params: unknown[] } }[]) {
      return client.begin(async tx => {
        const results = [];
        for (const query of queries) {
          const built = query.toSQL();
          results.push(await tx.unsafe(built.sql, built.params as never[]));
        }
        return results;
      });
    },
  });
}
