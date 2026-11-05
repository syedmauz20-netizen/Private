import 'server-only';
import { adminClient } from './supabase/admin';

function storage() {
  const name = process.env.SUPABASE_STORAGE_BUCKET;
  if (!name) throw new Error('SUPABASE_STORAGE_BUCKET is required');
  return adminClient().storage.from(name);
}
export const bucket = {
  async put(key: string, bytes: Uint8Array, options: { httpMetadata: { contentType: string } }) {
    const { error } = await storage().upload(key, bytes, { contentType: options.httpMetadata.contentType, upsert: false, cacheControl: '0' });
    if (error) throw new Error('CV could not be stored');
  },
  async get(key: string) {
    const { data, error } = await storage().download(key);
    if (error || !data) return null;
    return { size: data.size, body: { transformToByteArray: async () => new Uint8Array(await data.arrayBuffer()) } };
  },
  async delete(key: string) {
    const { error } = await storage().remove([key]);
    if (error) throw new Error('CV cleanup failed');
  },
};
export async function uploadUrl(key: string) {
  const { data, error } = await storage().createSignedUploadUrl(key, { upsert: false });
  if (error || !data) throw new Error('CV upload could not be prepared');
  return data.signedUrl;
}
export async function downloadUrl(key: string, name: string, _contentType: string) {
  const { data, error } = await storage().createSignedUrl(key, 60, { download: name });
  if (error || !data) throw new Error('CV download could not be prepared');
  return data.signedUrl;
}
