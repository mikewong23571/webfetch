import { NF_ERROR_CODE, NfErrorPayload } from '../error-codes';

export class NFError extends Error {
  code: NF_ERROR_CODE;
  url?: string;
  constructor(code: NF_ERROR_CODE, message: string, url?: string) {
    super(message);
    this.code = code;
    this.url = url;
  }
}

export function toResponse(error: NFError): Response {
  const payload: NfErrorPayload = {
    error: { code: error.code, message: error.message, url: error.url },
  };
  const status = error.code === NF_ERROR_CODE.BAD_URL ? 400 : 500;
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
