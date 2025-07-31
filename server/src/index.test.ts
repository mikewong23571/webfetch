import { describe, expect, it, vi } from 'vitest';
import worker from './index';

function makeRequest(body: unknown) {
  return new Request('http://localhost/fetch', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

describe('/fetch', () => {
  it('responds 400 on invalid body', async () => {
    const resp = await worker.fetch(new Request('http://localhost/fetch', { method: 'POST', body: 'not json' }), {}, {} as any);
    expect(resp.status).toBe(400);
  });

  it('returns cleaned chunks on success', async () => {
    const html = '<html><head><title>Example</title></head><body><article><p>Hello world</p></article></body></html>';
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(html));
    (global as any).caches = {
      default: {
        match: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      },
    };
    const resp = await worker.fetch(
      makeRequest({ url: 'https://example.com' }),
      {},
      { waitUntil: vi.fn() } as any,
    );
    const text = await resp.text();
    if (resp.status !== 200) {
      console.error('resp', resp.status, text);
    }
    expect(resp.status).toBe(200);
    const json = JSON.parse(text);
    expect(json.title).toBe('Example');
    expect(json.chunks.length).toBeGreaterThan(0);
  });
});
