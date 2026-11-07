import { boundedBody, equalSecret, verifySignature } from './security.ts';
import { parseEvents } from './events.ts';
import type { Database } from './database.ts';
export function webhook(deps: { appSecret: string; verifyToken: string; db: Pick<Database, 'rpc'>; kick?: () => void }) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      if (url.searchParams.get('hub.mode') === 'subscribe' && await equalSecret(url.searchParams.get('hub.verify_token') ?? '', deps.verifyToken)) {
        return new Response(url.searchParams.get('hub.challenge') ?? '', { headers: { 'Content-Type': 'text/plain' } });
      }
      return new Response('Forbidden', { status: 403 });
    }
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    if (!deps.appSecret) return new Response('Not configured', { status: 503 });
    let raw: Uint8Array;
    try { raw = await boundedBody(request.body, 1024 * 1024); } catch { return new Response('Too large', { status: 413 }); }
    if (!await verifySignature(raw, request.headers.get('x-hub-signature-256'), deps.appSecret)) return new Response('Forbidden', { status: 403 });
    let events;
    try { events = parseEvents(JSON.parse(new TextDecoder().decode(raw))); } catch { return new Response('Invalid event', { status: 400 }); }
    try {
      for (const envelope of events) await deps.db.rpc('ma_wa_receber', { telefone_id: envelope.phone, eventos: envelope.events });
    } catch { return new Response('Persistence unavailable', { status: 503 }); }
    // Acknowledge only after durable receipt. Cron is the independent recovery path.
    deps.kick?.(); return new Response('EVENT_RECEIVED');
  };
}
