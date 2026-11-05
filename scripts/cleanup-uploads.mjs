// Operator job. Run with server environment variables, never browser credentials.
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
const { DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_STORAGE_BUCKET } = process.env;
if (!DATABASE_URL || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SECRET_KEY || SUPABASE_STORAGE_BUCKET !== 'portal-cvs') throw new Error('Server configuration and portal-cvs bucket are required');
const sql = postgres(DATABASE_URL, { prepare: false, max: 1, ssl: 'require' });
const storage = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(SUPABASE_STORAGE_BUCKET);
try {
  // Read metadata only. Always delete bytes with the Storage API.
  const objects = await sql`SELECT name FROM storage.objects WHERE bucket_id=${SUPABASE_STORAGE_BUCKET} AND name LIKE 'pending-resumes/%' AND created_at < now()-interval '24 hours' LIMIT 1000`;
  for (let i = 0; i < objects.length; i += 100) {
    const { error } = await storage.remove(objects.slice(i, i + 100).map(row => row.name));
    if (error) throw new Error('Temporary upload cleanup failed');
  }
  console.log(`Removed ${objects.length} expired temporary uploads.`);
} catch { console.error('Upload cleanup failed. Check operator configuration.'); process.exitCode = 1; }
finally { await sql.end(); }
