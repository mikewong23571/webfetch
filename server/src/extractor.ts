import { Readability } from '@mozilla/readability';
import sanitizeHtml from 'sanitize-html';
import { NF_ERROR_CODE } from '../../error-codes';
import { DOMParser } from 'linkedom';

export function extract(html: string, pageUrl: string): { title: string; text: string } {
  const document = new DOMParser().parseFromString(html, 'text/html');
  (document as any).location = new URL(pageUrl) as any;
  const reader = new Readability(document as any, { baseURI: pageUrl });
  const article = reader.parse();
  if (!article || !article.textContent) {
    throw new Error(NF_ERROR_CODE.EMPTY_CONTENT);
  }
  const sanitized = sanitizeHtml(article.textContent, {
    allowedTags: [],
    allowedAttributes: {},
  });
  return { title: article.title || '', text: sanitized };
}
