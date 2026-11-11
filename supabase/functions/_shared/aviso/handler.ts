import type { Database } from '../whatsapp/database.ts';
/** Public notice page data: an approved alert or a neighbourhood action. Only the fields PostgreSQL releases;
 *  no citizen data. The photo is streamed only when the approval chose to show it. */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'X-Content-Type-Options': 'nosniff' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status,
  headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store' } });
export function aviso(deps: { db: Pick<Database, 'rpc' | 'read'> }) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'GET') return json({ erro: 'method' }, 405);
    const q = new URL(request.url).searchParams;
    const municipio = q.get('m') ?? '', colecao = q.get('c') ?? '', registro = q.get('id') ?? '';
    if (!/^[a-z0-9-]{1,60}$/.test(municipio) || !['alertas', 'acoes'].includes(colecao) || !/^[A-Za-z0-9_-]{1,120}$/.test(registro)) return json({ erro: 'parametros' }, 400);
    try {
      if (q.get('foto') === '1') {
        if (colecao !== 'alertas') return json({ erro: 'nao_encontrado' }, 404);
        const foto = await deps.db.rpc<{ path: string; mime: string } | null>('ma_aviso_foto', { municipio, registro });
        if (!foto || !['image/jpeg', 'image/png'].includes(foto.mime)) return json({ erro: 'nao_encontrado' }, 404);
        const object = await deps.db.read(foto.path);
        return new Response(object.body, { headers: { ...CORS, 'Content-Type': foto.mime, 'Cache-Control': 'public, max-age=300' } });
      }
      const dados = await deps.db.rpc('ma_aviso_publico', { municipio, colecao_alvo: colecao, registro });
      return dados ? json(dados) : json({ erro: 'nao_encontrado' }, 404);
    } catch { return json({ erro: 'indisponivel' }, 503); } // Never echo database or storage details.
  };
}
