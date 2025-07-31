import { sha256 } from './util';
import validateImport from './compiled-schema';
import { renderMarkdown } from './renderer';
import { extract } from './extractor';
import { chunkText } from './chunker';
import { NFError, toResponse } from './errors';
import { NF_ERROR_CODE } from '../error-codes';
const validate: (data: unknown) => boolean & { errors?: any } =
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

const SYS_PROMPT = 'Fetch • Clean • Chunk at the edge.';

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
      return toResponse(new NFError(NF_ERROR_CODE.BAD_URL, 'Invalid JSON'));
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

    try {
      const html = await renderMarkdown(input.url, input.options?.wait_until || 'load');
      const article = extract(html, input.url);
      const chunks = chunkText(article.text, input.options?.max_tokens || 32768).map(c => ({
        seq: c.seq,
        text: `${SYS_PROMPT}\n${input.prompt || ''}\n${c.text}`,
      }));
      const payload = {
        title: article.title,
        chunks,
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
      console.log(JSON.stringify({ tag: '[NF]', cache: 'miss' }));
      return response;
    } catch (e: any) {
      if (e instanceof NFError) {
        return toResponse(e);
      }
      return toResponse(new NFError(NF_ERROR_CODE.RENDER_FAIL, e.message));
    }
  },
};
