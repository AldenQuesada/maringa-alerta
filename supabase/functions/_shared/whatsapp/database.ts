export class Database {
  constructor(readonly url: string, private key: string, private request: typeof fetch = fetch) {
    if (!url || !key) throw Error('database_config');
  }
  async rpc<T = any>(name: string, params: object = {}): Promise<T> {
    const response = await this.request(`${this.url}/rest/v1/rpc/${name}`, { method: 'POST',
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(params), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(`rpc_${response.status}`); // Never log payloads, tokens or citizen data.
    return response.json();
  }
  async remove(path: string): Promise<void> {
    if (!/^[0-9a-f-]{36}\/[0-9]+\.(jpg|png)$/.test(path)) throw Error('storage_path');
    const response = await this.request(`${this.url}/storage/v1/object/ma-whatsapp`, { method: 'DELETE',
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [path] }), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error(`storage_delete_${response.status}`);
  }
  async read(path: string): Promise<Response> {
    if (!/^[0-9a-f-]{36}\/[0-9]+\.(jpg|png)$/.test(path)) throw Error('storage_path');
    const response = await this.request(`${this.url}/storage/v1/object/ma-whatsapp/${path}`, {
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}` }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error(`storage_read_${response.status}`);
    return response;
  }
  async store(path: string, mime: string, data: Uint8Array): Promise<void> {
    const response = await this.request(`${this.url}/storage/v1/object/ma-whatsapp/${path}`, { method: 'POST',
      headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type': mime, 'x-upsert': 'true' },
      body: data as BodyInit, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(`storage_${response.status}`);
  }
}
