import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { load } from './helpers/supabase-fixture.mjs';
const requests = [];
const sdk = createClient('https://storage.example.test', 'synthetic-test-key', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async (url, options) => {
    const request = new Request(url, options); requests.push(request);
    const path = new URL(request.url).pathname;
    if (path.includes('/object/upload/sign/')) return Response.json({ url: '/object/upload/sign/portal-cvs/pending-resumes/test?token=synthetic-upload-token' });
    if (path.includes('/object/sign/')) return Response.json({ signedURL: '/object/sign/portal-cvs/resumes/test/file?token=synthetic-download-token' });
    if (request.method === 'GET') return new Response('%PDF-1.4\nFixture', { headers: { 'Content-Type': 'application/pdf' } });
    return Response.json({ Key: 'portal-cvs/resumes/test/file' });
  } },
});
process.env.SUPABASE_STORAGE_BUCKET = 'portal-cvs';
const storage = load('lib/storage.ts', { './supabase/admin': { adminClient: () => sdk } });
const signed = await storage.uploadUrl('pending-resumes/test');
assert.ok(signed.startsWith('https://storage.example.test/storage/v1/object/upload/sign/portal-cvs/'));
assert.equal(requests.at(-1).method, 'POST');
assert.notEqual(requests.at(-1).headers.get('x-upsert'), 'true');
await storage.bucket.put('resumes/test/file', new TextEncoder().encode('%PDF-1.4\nFixture'), { httpMetadata: { contentType: 'application/pdf' } });
assert.equal(requests.at(-1).method, 'POST');
assert.equal(requests.at(-1).headers.get('x-upsert'), 'false');
assert.equal(requests.at(-1).headers.get('content-type'), 'application/pdf');
const object = await storage.bucket.get('resumes/test/file');
assert.ok(object.size > 0); assert.equal((await object.body.transformToByteArray())[0], 37);
const url = new URL(await storage.downloadUrl('resumes/test/file', 'resume.pdf', 'application/pdf'));
assert.equal(url.searchParams.get('download'), 'resume.pdf');
assert.equal(JSON.parse(await requests.at(-1).clone().text()).expiresIn, 60);
await storage.bucket.delete('resumes/test/file');
assert.equal(requests.at(-1).method, 'DELETE');
assert.deepEqual(JSON.parse(await requests.at(-1).clone().text()).prefixes, ['resumes/test/file']);
console.log('Supabase Storage SDK checks passed: private bucket routing, non-overwriting uploads, binary retrieval, 60-second downloads and targeted cleanup. HTTP responses are isolated fixtures.');
