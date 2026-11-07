import { boundedBody } from './security.ts';
import type { Database } from './database.ts';
const LIMIT = 5 * 1024 * 1024;
export function trustedMediaURL(value: string): boolean {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port &&
    (u.hostname === 'lookaside.fbsbx.com' || u.hostname.endsWith('.facebook.com') || u.hostname.endsWith('.fbcdn.net')); } catch { return false; }
}
export async function ingestImage(item: any, token: string, db: Pick<Database, 'store'>, request: typeof fetch = fetch) {
  const id = item.event.image?.id; if (!/^\d+$/.test(id ?? '')) return null;
  const headers = { Authorization: `Bearer ${token}` };
  const metadata = await request(`https://graph.facebook.com/${item.graph_version}/${id}`, { headers, redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!metadata.ok) { if (metadata.status >= 500 || metadata.status === 429) throw Error('media_retry'); return null; }
  const m = await metadata.json(); if (!['image/jpeg', 'image/png'].includes(m.mime_type) || m.file_size > LIMIT || !trustedMediaURL(m.url)) return null;
  const response = await request(m.url, { headers, redirect: 'error', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw Error('media_download');
  let bytes: Uint8Array; try { bytes = await boundedBody(response.body, LIMIT); } catch { return null; }
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  if ((m.mime_type === 'image/jpeg' && !jpeg) || (m.mime_type === 'image/png' && !png)) return null;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)));
  const hash = btoa(String.fromCharCode(...digest));
  if ((m.sha256 && m.sha256 !== hash) || (item.event.image.sha256 && item.event.image.sha256 !== hash)) return null;
  const path = `${item.channel_id}/${item.id}.${jpeg ? 'jpg' : 'png'}`;
  await db.store(path, m.mime_type, bytes);
  return { bucket: 'ma-whatsapp', path, mime: m.mime_type, size: bytes.length, sha256: hash };
}
