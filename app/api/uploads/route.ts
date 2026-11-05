import { randomUUID } from 'node:crypto';
import { sameOrigin, rateLimit } from '../../../lib/session';
import { MAX_RESUME_BYTES, safeResumeName, resumeContentType, readBoundedBody } from '../../../lib/resume';
import { signUpload } from '../../../lib/upload-ticket';
import { uploadUrl } from '../../../lib/storage';

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return Response.json({ error: 'Invalid origin' }, { status: 403 });
    if (!await rateLimit(request, 'upload')) return Response.json({ error: 'Too many attempts. Retry in 15 minutes.' }, { status: 429 });
    const body = await readBoundedBody(request, 4096);
    const { name, size, checksum } = JSON.parse(new TextDecoder().decode(body));
    if (typeof name !== 'string' || name.length > 250 || !/\.(pdf|docx)$/i.test(name) || !Number.isInteger(size) || size <= 0 || size > MAX_RESUME_BYTES || typeof checksum !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(checksum)) return Response.json({ error: 'Choose a PDF or DOCX résumé up to 5 MB.' }, { status: 400 });
    const id = randomUUID();
    const key = `pending-resumes/${id}`;
    const contentType = resumeContentType(name);
    const ticket = signUpload({ id, key, name: safeResumeName(name), size, checksum, expires: Date.now() + 600000 });
    return Response.json({ url: await uploadUrl(key), ticket, contentType }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'Upload could not be prepared. Please retry.' }, { status: 400 }); }
}
