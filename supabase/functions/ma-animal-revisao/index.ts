import Anthropic from 'npm:@anthropic-ai/sdk@1.4.0';
import { Database } from '../_shared/whatsapp/database.ts';
import { equalSecret } from '../_shared/whatsapp/security.ts';
import { processarFila } from '../_shared/revisao/fila.ts';
import { revisorClaude } from '../_shared/revisao/claude.ts';
const env = (key: string) => Deno.env.get(key) ?? '';
Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!await equalSecret(request.headers.get('x-ma-worker-secret') ?? '', env('WHATSAPP_WORKER_SECRET'))) return new Response('Forbidden', { status: 403 });
  if (!env('ANTHROPIC_API_KEY')) return new Response('Not configured', { status: 503 });
  try {
    const client = new Anthropic({ apiKey: env('ANTHROPIC_API_KEY'), timeout: 40000, maxRetries: 1 });
    return Response.json(await processarFila(new Database(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY')), revisorClaude(client)));
  } catch { return new Response('Review unavailable', { status: 503 }); }
});
