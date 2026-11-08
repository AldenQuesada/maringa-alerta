import type { Database } from './database.ts';
/** Durable, idempotent removal of private files belonging to deleted inbox entries. */
export async function cleanDeletedMedia(db: Pick<Database, 'rpc' | 'remove'>, budget = 15000) {
  const start = Date.now(); let removed = 0;
  for (let n = 0; n < 20 && Date.now() - start < budget; n++) {
    const item = await db.rpc<{ id: string; lease: string; path: string } | null>('ma_wa_midia_excluir_reservar');
    if (!item) break;
    let success = false;
    try { await db.remove(item.path); success = true; removed++; } catch { /* Retry is persisted below. */ }
    await db.rpc('ma_wa_midia_excluir_resultado', { tarefa: item.id, reserva: item.lease, sucesso: success });
  }
  return removed;
}
