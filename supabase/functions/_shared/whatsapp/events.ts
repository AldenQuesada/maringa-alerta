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
      const profile = value.contacts?.find((c: ObjectMap) => c.wa_id === m.from)?.profile?.name;
      const profileName = typeof profile === 'string' ? profile.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120) : undefined;
      events.push({ profile_name: profileName || undefined, type: 'message', id: m.id, from: m.from, timestamp: m.timestamp,
        text: m.type === 'text' ? m.text?.body : m.type === 'button' ? m.button?.text : undefined,
        // Template quick replies arrive as type "button" and carry the payload set when the template was sent.
        button: m.type === 'interactive' ? m.interactive?.button_reply?.id ?? m.interactive?.list_reply?.id : m.type === 'button' ? m.button?.payload : undefined,
        image: m.type === 'image' ? { id: m.image?.id, mime_type: m.image?.mime_type, sha256: m.image?.sha256 } : undefined,
        // Location shared by the contact; PostgreSQL validates the coordinates.
        location: m.type === 'location' ? { latitude: m.location?.latitude, longitude: m.location?.longitude,
          name: typeof m.location?.name === 'string' ? m.location.name.slice(0, 200) : undefined,
          address: typeof m.location?.address === 'string' ? m.location.address.slice(0, 300) : undefined } : undefined });
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
