declare const EdgeRuntime: { waitUntil(task: Promise<unknown>): void };
import { Database } from '../_shared/whatsapp/database.ts';
import { webhook } from '../_shared/whatsapp/webhook.ts';
const env = (key: string) => Deno.env.get(key) ?? '';
const db = new Database(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
Deno.serve(webhook({ db, appSecret: env('WHATSAPP_APP_SECRET'), verifyToken: env('WHATSAPP_VERIFY_TOKEN'),
  kick: () => {
    const secret = env('WHATSAPP_WORKER_SECRET'); if (!secret) return;
    EdgeRuntime.waitUntil(fetch(`${env('SUPABASE_URL')}/functions/v1/ma-whatsapp-worker`, {
      method: 'POST', headers: { 'x-ma-worker-secret': secret }, signal: AbortSignal.timeout(45000)
    }).then((r) => r.body?.cancel()).catch(() => {}));
  }
}));
