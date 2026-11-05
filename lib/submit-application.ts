'use client';

export async function submitApplication(data: FormData) {
  const file = data.get('resume');
  if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) throw new Error('Attach a PDF or DOCX résumé up to 5 MB.');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
  const checksum = btoa(String.fromCharCode(...digest));
  const prepared = await fetch('/api/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, checksum }) });
  const upload = await prepared.json() as { error?: string; url?: string; contentType?: string; ticket?: string };
  if (!prepared.ok) throw new Error(upload.error || 'Upload could not be prepared.');
  if (typeof upload.url !== 'string' || typeof upload.contentType !== 'string' || typeof upload.ticket !== 'string') throw new Error('Invalid upload response. Please retry.');
  const stored = await fetch(upload.url, { method: 'PUT', headers: { 'Content-Type': upload.contentType }, body: file });
  if (!stored.ok) throw new Error('Résumé upload failed. Please retry.');
  data.delete('resume');
  data.set('resumeTicket', upload.ticket);
  return fetch('/api/apply', { method: 'POST', body: data });
}
