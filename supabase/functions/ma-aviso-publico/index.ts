import { Database } from '../_shared/whatsapp/database.ts';
import { aviso } from '../_shared/aviso/handler.ts';
const env = (key: string) => Deno.env.get(key) ?? '';
Deno.serve(aviso({ db: new Database(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY')) }));
