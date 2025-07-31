export enum NF_ERROR_CODE {
  BAD_URL = 'BAD_URL',
  TIMEOUT = 'TIMEOUT',
  RENDER_FAIL = 'RENDER_FAIL',
  EMPTY_CONTENT = 'EMPTY_CONTENT',
  CACHE_ERROR = 'CACHE_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}

export type NfErrorPayload = {
  error: {
    code: NF_ERROR_CODE;
    message: string;
    url?: string;
  };
};
