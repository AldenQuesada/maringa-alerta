export type Delivery = { id: string; lease: string; to: string; phone_number_id: string; graph_version: string;
  payload: { text: string; buttons: { id: string; label: string; full_label?: string }[]; list_button?: string; list_title?: string;
    image?: { url: string; mime_type: string; sha256: string; alt: string } } };
export function providerPayload(item: Delivery) {
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to: item.to, biz_opaque_callback_data: item.id };
  if (item.payload.image) return { ...base, type: 'image', image: { link: item.payload.image.url, caption: item.payload.text } };
  const buttons = item.payload.buttons ?? [];
  if ((buttons.length > 3 || buttons.some(b => (b.full_label?.length ?? 0) > 20)) && buttons.length <= 10 && item.payload.text.length <= 1024) return { ...base, type: 'interactive',
    interactive: { type: 'list', body: { text: item.payload.text }, action: {
      button: item.payload.list_button, sections: [{ title: item.payload.list_title, rows: buttons.map(b => ({ id: b.id, title: b.label, description: b.full_label })) }]
    } } };
  // Meta protocol limits, independent of editorial content stored in PostgreSQL.
  if (buttons.length > 0 && buttons.length <= 3 && item.payload.text.length <= 1024) return { ...base, type: 'interactive',
    interactive: { type: 'button', body: { text: item.payload.text }, action: {
      buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.label } })) } } };
  return { ...base, type: 'text', text: { body: item.payload.text, preview_url: false } };
}
export async function deliver(item: Delivery, token: string, request: typeof fetch = fetch) {
  try {
    const response = await request(`https://graph.facebook.com/${item.graph_version}/${item.phone_number_id}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(providerPayload(item)), redirect: 'error', signal: AbortSignal.timeout(20000) });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.messages?.[0]?.id) return { resultado: 'sent', provedor_id: body.messages[0].id, codigo: null };
    // Only an explicit rate-limit rejection is safe to retry automatically.
    if (response.status === 429 || (response.status === 400 && [130429, 131056].includes(body.error?.code)))
      return { resultado: 'retry', provedor_id: null, codigo: String(body.error?.code ?? 429) };
    return { resultado: response.status >= 500 || response.ok ? 'uncertain' : 'failed', provedor_id: null, codigo: String(body.error?.code ?? response.status) };
  } catch { return { resultado: 'uncertain', provedor_id: null, codigo: 'transport_unknown' }; }
}
