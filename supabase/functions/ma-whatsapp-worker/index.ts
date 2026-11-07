import { Database } from '../_shared/whatsapp/database.ts';
import { equalSecret } from '../_shared/whatsapp/security.ts';
import { drain } from '../_shared/whatsapp/worker.ts';
const env = (key: string) => Deno.env.get(key) ?? '';
Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!await equalSecret(request.headers.get('x-ma-worker-secret') ?? '', env('WHATSAPP_WORKER_SECRET'))) return new Response('Forbidden', { status: 403 });
  if (!env('WHATSAPP_ACCESS_TOKEN')) return new Response('Not configured', { status: 503 });
  try { return Response.json(await drain(new Database(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY')), env('WHATSAPP_ACCESS_TOKEN'))); }
  catch { return new Response('Worker unavailable', { status: 503 }); }
});
