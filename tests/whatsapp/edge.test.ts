import { verifySignature, boundedBody } from '../../supabase/functions/_shared/whatsapp/security.ts';
import { webhook } from '../../supabase/functions/_shared/whatsapp/webhook.ts';
import { parseEvents } from '../../supabase/functions/_shared/whatsapp/events.ts';
import { deliver, providerPayload, type Delivery } from '../../supabase/functions/_shared/whatsapp/transport.ts';
import { trustedMediaURL, ingestImage } from '../../supabase/functions/_shared/whatsapp/media.ts';
function assert(value: unknown, message = 'Assertion failed'): asserts value { if (!value) throw Error(message); }
async function sign(text: string) { const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('test-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return 'sha256=' + Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)))).map(v => v.toString(16).padStart(2, '0')).join(''); }
const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
  metadata: { phone_number_id: '123' }, messages: [{ id: 'wamid.test', from: '550000000000', timestamp: '1794010000', type: 'interactive', interactive: { button_reply: { id: '4:action:confirm' } } }]
} }] }] });
Deno.test('HMAC authenticates the exact raw bytes and rejects changes', async () => {
  const signature = await sign(payload); assert(await verifySignature(new TextEncoder().encode(payload), signature, 'test-secret'));
  assert(!await verifySignature(new TextEncoder().encode(payload + ' '), signature, 'test-secret'));
  assert(!await verifySignature(new Uint8Array(), null, 'test-secret'));
});
Deno.test('Webhook rejects unsigned requests before database access; persistence failure returns 503', async () => {
  let calls = 0; let fail = false;
  const handler = webhook({ appSecret: 'test-secret', verifyToken: 'verify', db: { rpc: async () => { calls++; if (fail) throw Error('db'); return null as any; } } });
  const request = (signature: string) => new Request('https://example.invalid', { method: 'POST', body: payload, headers: { 'x-hub-signature-256': signature } });
  assert((await handler(request('bad'))).status === 403); assert(calls === 0);
  const signature = await sign(payload); assert((await handler(request(signature))).status === 200); assert(Number(calls) === 1);
  fail = true; assert((await handler(request(signature))).status === 503);
  assert((await handler(new Request('https://example.invalid?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=123'))).status === 200);
});
Deno.test('Parser preserves sender identity and rejects unsupported transport shapes', () => {
  const result = parseEvents(JSON.parse(payload)); assert(result[0].events[0].button === '4:action:confirm');
  assert(result[0].events[0].from === '550000000000'); assert(parseEvents({ object: 'unrelated' }).length === 0);
});
const item: Delivery = { id: crypto.randomUUID(), lease: crypto.randomUUID(), to: '550000000000', phone_number_id: '123', graph_version: 'v23.0', payload: { text: 'Pergunta do banco', buttons: [{ id: '1:action:confirm', label: 'Botão do banco' }] } };
Deno.test('Transport uses database copy and never retries an unknown network outcome', async () => {
  assert(providerPayload(item).type === 'interactive');
  const timeout = await deliver(item, 'fake', () => Promise.reject(Error('timeout'))); assert(timeout.resultado === 'uncertain');
  const limited = await deliver(item, 'fake', () => Promise.resolve(Response.json({ error: { code: 130429 } }, { status: 429 }))); assert(limited.resultado === 'retry');
  const accepted = await deliver(item, 'fake', () => Promise.resolve(Response.json({ messages: [{ id: 'wamid.output' }] }))); assert(accepted.provedor_id === 'wamid.output');
  const rejected = await deliver(item, 'fake', () => Promise.resolve(Response.json({ error: { code: 131026 } }, { status: 400 }))); assert(rejected.resultado === 'failed');
});
Deno.test('Photos reject redirects to untrusted hosts, oversized bodies and wrong magic bytes', async () => {
  assert(trustedMediaURL('https://lookaside.fbsbx.com/media')); assert(!trustedMediaURL('https://lookaside.fbsbx.com.attacker.invalid/media'));
  assert(!trustedMediaURL('http://127.0.0.1/a')); assert(!trustedMediaURL('https://user:pass@lookaside.fbsbx.com/media'));
  let rejected = false; try { await boundedBody(new Response('123456').body, 5); } catch { rejected = true; } assert(rejected);
  let stored = false; let count = 0;
  const result = await ingestImage({ channel_id: 'c', id: 1, graph_version: 'v23.0', event: { image: { id: '123' } } }, 'fake', { store: async () => { stored = true; } },
    () => Promise.resolve(++count === 1 ? Response.json({ url: 'https://lookaside.fbsbx.com/media', mime_type: 'image/jpeg', file_size: 3 }) : new Response('bad')));
  assert(result === null && !stored);
});
Deno.test('Institutional image URL and caption come exclusively from the catalog payload', () => {
  const image = { url: 'https://example.invalid/institution.png', mime_type: 'image/png', sha256: 'a'.repeat(64), alt: 'Texto do banco' };
  const result = providerPayload({ ...item, payload: { text: 'Legenda do banco', buttons: [], image } }) as any;
  assert(result.type === 'image' && result.image.link === image.url && result.image.caption === 'Legenda do banco');
});
Deno.test('Long canonical labels survive Meta limits in list descriptions, including review actions', () => {
  const full = '✓ Confirmar e concluir';
  const result = providerPayload({ ...item, payload: { text: 'Revisão do banco', list_button: 'Selecionar', list_title: 'Opções', buttons: [{ id: '9:action:confirm', label: 'Confirmar e concluir', full_label: full }] } }) as any;
  assert(result.interactive.type === 'list');
  assert(result.interactive.action.sections[0].rows[0].description === full);
  assert(result.interactive.action.sections[0].rows[0].title.length <= 24);
});
Deno.test('Contact profile is bounded and belongs only to the verified sender', () => {
 const body=JSON.parse(payload),v=body.entry[0].changes[0].value;
 v.contacts=[{wa_id:'other',profile:{name:'Wrong person'}},{wa_id:v.messages[0].from,profile:{name:' Nome\n'+ 'x'.repeat(180)}}];
 const name=parseEvents(body)[0].events[0].profile_name;
 assert(name.startsWith('Nome'));assert(name.length===120);assert(!name.includes('\n'));
 v.contacts=[{wa_id:'other',profile:{name:'Wrong person'}}];assert(parseEvents(body)[0].events[0].profile_name===undefined);
});

Deno.test('Private cleanup uses Storage API, exact keys, retries and fenced receipts', async () => {
 const { Database } = await import('../../supabase/functions/_shared/whatsapp/database.ts');
 const { cleanDeletedMedia } = await import('../../supabase/functions/_shared/whatsapp/cleanup.ts');
 const path='00000000-0000-4000-8000-000000000001/12.jpg';let request:Request|null=null;
 const db=new Database('https://example.invalid','test',async(input,init)=>{request=new Request(input,init);return Response.json([]);});
 await db.remove(path);assert(request!.method==='DELETE');assert(request!.url==='https://example.invalid/storage/v1/object/ma-whatsapp');
 assert(JSON.stringify(await request!.json())===JSON.stringify({prefixes:[path]}));
 let rejected=false;try{await db.remove('../institutional-logo.png');}catch{rejected=true;}assert(rejected);
 const calls:any[]=[];let remaining=1;
 const fake={rpc:async(name:string,args?:any)=>{calls.push([name,args]);return name==='ma_wa_midia_excluir_reservar'&&remaining-- > 0?{id:'job',lease:'lease',path}:null;},remove:async():Promise<void>=>{throw Error('temporary');}};
 assert(await cleanDeletedMedia(fake as any)===0);
 assert(calls[1][1].sucesso===false&&calls[1][1].reserva==='lease');
 remaining=1;calls.length=0;fake.remove=async()=>{};
 assert(await cleanDeletedMedia(fake as any)===1);assert(calls[1][1].sucesso===true);
});
