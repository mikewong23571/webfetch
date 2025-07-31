import { sha256 } from './util';
import validateImport from './compiled-schema';
const validate: (data: unknown) => boolean & {errors?: any} =
  (validateImport as any).default || (validateImport as any);

interface FetchOptions {
  render_strategy?: 'markdown' | 'html' | 'playwright';
  max_tokens?: number;
  wait_until?: 'networkidle' | 'load';
}

interface FetchRequest {
  url: string;
  prompt?: string;
  options?: FetchOptions;
}

interface Env {}

export default {
  async fetch(req: Request, _env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/fetch') {
      return new Response('Not Found', { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: { message: 'Invalid JSON' } }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    if (!validate(body)) {
      return new Response(
        JSON.stringify({ error: { message: 'Validation failed', details: validate.errors } }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    const input = body as FetchRequest;
    const keyHash = await sha256(input.url + (input.prompt || ''));
    const cacheUrl = new URL(req.url);
    cacheUrl.searchParams.set('key', keyHash);
    const cache = caches.default;
    const cached = await cache.match(cacheUrl.toString());
    if (cached) {
      return cached;
    }

    // Placeholder payload until renderer implemented
    const payload = {
      title: '',
      chunks: [],
      meta: { fetched_at: new Date().toISOString(), render_strategy: 'markdown' },
    };
    const response = new Response(JSON.stringify(payload), {
      headers: { 'content-type': 'application/json' },
    });

    ctx.waitUntil(
      cache.put(cacheUrl.toString(), response.clone(), {
        expirationTtl: 43200,
      }),
    );

    return response;
  },
};
