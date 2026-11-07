type ObjectMap = Record<string, any>;
export type Envelope = { phone: string; events: ObjectMap[] };
/** Converts Meta's transport envelope only; no business flow or response copy. */
export function parseEvents(body: ObjectMap): Envelope[] {
  if (body.object !== 'whatsapp_business_account') return [];
  const result: Envelope[] = [];
  for (const entry of body.entry ?? []) for (const change of entry.changes ?? []) {
    if (change.field !== 'messages') continue;
    const value = change.value; const phone = value?.metadata?.phone_number_id;
    if (!/^\d+$/.test(phone ?? '')) throw Error('invalid_phone');
    const events: ObjectMap[] = [];
    for (const m of value.messages ?? []) {
      if (!m.id || !/^\d{7,15}$/.test(m.from ?? '') || !/^\d{1,12}$/.test(m.timestamp ?? '')) throw Error('invalid_message');
      events.push({ type: 'message', id: m.id, from: m.from, timestamp: m.timestamp,
        text: m.type === 'text' ? m.text?.body : undefined,
        button: m.type === 'interactive' ? m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id : undefined,
        image: m.type === 'image' ? { id: m.image?.id, mime_type: m.image?.mime_type, sha256: m.image?.sha256 } : undefined });
    }
    for (const s of value.statuses ?? []) {
      if (!s.id || !['sent', 'delivered', 'read', 'failed'].includes(s.status) || !/^\d{1,12}$/.test(s.timestamp ?? '')) continue;
      events.push({ type: 'status', id: s.id, status: s.status, timestamp: s.timestamp,
        outbox_id: s.biz_opaque_callback_data, error_code: s.errors?.[0]?.code?.toString() });
    }
    if (events.length) result.push({ phone, events });
  }
  return result;
}
