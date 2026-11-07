import type { Database } from './database.ts';
import { ingestImage } from './media.ts';
import { deliver, type Delivery } from './transport.ts';
export async function drain(db: Database, token: string) {
  const start = Date.now(); let processed = 0; let sent = 0;
  const inputs = await db.rpc<any[]>('ma_wa_entradas');
  for (const input of inputs) {
    if (Date.now() - start > 35000) break;
    try {
      const midia = input.event.image ? await ingestImage(input, token, db) : null;
      if (await db.rpc('ma_wa_processar', { entrada: input.id, midia })) processed++;
    } catch { await db.rpc('ma_wa_falha_entrada', { entrada: input.id }); }
  }
  for (let count = 0; count < 30 && Date.now() - start < 40000; count++) {
    const item = await db.rpc<Delivery | null>('ma_wa_reservar'); if (!item) break;
    const result = await deliver(item, token);
    await db.rpc('ma_wa_resultado', { saida: item.id, reserva: item.lease, ...result });
    if (result.resultado === 'sent') sent++;
  }
  return { processed, sent };
}
