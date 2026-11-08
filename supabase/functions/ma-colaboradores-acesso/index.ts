import { createHandler } from './handler.ts';
const env=(name:string)=>Deno.env.get(name)||'';
Deno.serve(createHandler({url:env('SUPABASE_URL'),anonKey:env('SUPABASE_ANON_KEY'),serviceKey:env('SUPABASE_SERVICE_ROLE_KEY'),secret:env('PRA_SOMAR_ACCESS_SECRET'),appUrl:env('PRA_SOMAR_APP_URL')||'https://aldenquesada.github.io/maringa-alerta/',emailFrom:env('PRA_SOMAR_EMAIL_FROM'),resendKey:env('RESEND_API_KEY')}));
