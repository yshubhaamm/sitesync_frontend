import type { ApiErrorInfo } from '../types/api';
import { formatApiError } from '../utils/apiAdapters';

export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

export class SiteSyncApiError extends Error {
  public readonly info: ApiErrorInfo;

  constructor(info: ApiErrorInfo) {
    super(info.message);
    this.name = 'SiteSyncApiError';
    this.info = info;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (!text) return null;

  if (
    contentType.includes('application/json') ||
    text.trim().startsWith('{') ||
    text.trim().startsWith('[')
  ) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

/**
 * Centralized fetch wrapper for the local FastAPI backend.
 * Authentication is none — intentionally does NOT pass credentials: "include".
 */
export async function apiRequest<T>(
  path: string,
  init: RequestInit,
  normalizer: (raw: unknown) => T
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch (err) {
    const message =
      err instanceof Error
        ? `Unable to reach backend at ${API_BASE_URL} (${err.message}). Verify FastAPI is running and CORS allows this origin.`
        : `Unable to reach backend at ${API_BASE_URL}.`;
    throw new SiteSyncApiError(formatApiError(undefined, err, message));
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new SiteSyncApiError(
      formatApiError(
        response.status,
        body,
        `Request failed (${response.status} ${response.statusText})`
      )
    );
  }

  return normalizer(body);
}
