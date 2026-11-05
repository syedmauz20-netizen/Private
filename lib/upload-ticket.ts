import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
export type UploadTicket = { id: string; key: string; name: string; size: number; checksum: string; expires: number };
function signature(payload: string) {
  const secret = process.env.UPLOAD_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error('UPLOAD_TOKEN_SECRET must contain at least 32 characters');
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
export function signUpload(ticket: UploadTicket) {
  const payload = Buffer.from(JSON.stringify(ticket)).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export function verifyUpload(value: string): UploadTicket {
  const [payload, sig, extra] = value.split('.');
  if (!payload || !sig || extra || sig.length !== 43) throw new Error('Invalid upload ticket');
  const expected = signature(payload);
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('Invalid upload ticket');
  const ticket = JSON.parse(Buffer.from(payload, 'base64url').toString()) as UploadTicket;
  if (ticket.expires < Date.now() || !ticket.key.startsWith('pending-resumes/')) throw new Error('Upload expired');
  return ticket;
}
