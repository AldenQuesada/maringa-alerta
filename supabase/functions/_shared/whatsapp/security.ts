export async function verifySignature(raw: Uint8Array, signature: string | null, secret: string): Promise<boolean> {
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature ?? '') || !secret) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const digest = Uint8Array.from(signature!.slice(7).match(/../g)!, (v) => parseInt(v, 16));
  return crypto.subtle.verify('HMAC', key, digest, new Uint8Array(raw));
}
export async function equalSecret(value: string, expected: string): Promise<boolean> {
  if (!value || !expected) return false;
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([digest(value), digest(expected)]);
  let difference = 0; for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
export async function boundedBody(body: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  const reader = body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length; if (size > limit) throw new Error('body_limit'); chunks.push(value);
  } } finally { await reader.cancel(); reader.releaseLock(); }
  const result = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
