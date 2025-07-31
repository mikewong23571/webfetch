import { NF_ERROR_CODE } from '../../error-codes';

export async function renderMarkdown(url: string, waitUntil: 'networkidle' | 'load' = 'load'): Promise<string> {
  const endpoint = 'https://browser.render.workers.dev/markdown';
  const apiUrl = `${endpoint}?url=${encodeURIComponent(url)}&wait_until=${waitUntil}`;
  const resp = await fetch(apiUrl);
  if (!resp.ok) {
    throw new Error(NF_ERROR_CODE.RENDER_FAIL);
  }
  return await resp.text();
}
