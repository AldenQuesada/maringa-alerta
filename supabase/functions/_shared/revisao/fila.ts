import type { Database } from '../whatsapp/database.ts';
/** Queue of animal reports for AI review. The database decides what to review, what goes in and what is stored. */
export type Reserva = { municipio: string; relato: string; lease: string; modelo: string; esforco: string; instrucoes: string; entrada: Record<string, unknown> };
export type Revisao = { resumo: string; urgencia: 'Alta' | 'Média' | 'Baixa'; situacao_confere: boolean; observacoes: string[]; sugestao_alerta: string };
export type Revisor = (reserva: Reserva) => Promise<{ revisao: Revisao | null; codigo: string | null }>;
export async function processarFila(db: Pick<Database, 'rpc'>, revisar: Revisor, budget = 50000) {
  const start = Date.now(); let feitas = 0;
  // Each review may take tens of seconds: stop reserving while there is still time to record the result.
  for (let n = 0; n < 5 && Date.now() - start < budget - 25000; n++) {
    const reserva = await db.rpc<Reserva | null>('ma_wa_revisao_reservar'); if (!reserva) break;
    let resultado: { revisao: Revisao | null; codigo: string | null };
    try { resultado = await revisar(reserva); } catch { resultado = { revisao: null, codigo: 'erro' }; }
    await db.rpc('ma_wa_revisao_resultado', { municipio: reserva.municipio, relato: reserva.relato, reserva: reserva.lease,
      resultado: resultado.revisao, codigo: resultado.revisao ? null : resultado.codigo ?? 'sem_resultado' });
    if (resultado.revisao) feitas++;
  }
  return { feitas };
}
