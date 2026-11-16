import type {
  ApiErrorInfo,
  NormalizedDailyReport,
  NormalizedHealth,
  NormalizedImportResult,
  NormalizedProjectState,
  NormalizedRecomputeResult,
  WhatsAppImportRequest,
} from '../types/api';
import {
  formatApiError,
  normalizeDailyReport,
  normalizeHealthResponse,
  normalizeImportResponse,
  normalizeProjectState,
  normalizeRecomputeResponse,
} from '../utils/apiAdapters';

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

  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

async function request<T>(
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
        ? `Network or CORS error connecting to ${API_BASE_URL}: ${err.message}`
        : `Network or CORS error connecting to ${API_BASE_URL}`;
    throw new SiteSyncApiError(formatApiError(undefined, err, message));
  }

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new SiteSyncApiError(
      formatApiError(response.status, body, `Request failed (${response.status} ${response.statusText})`)
    );
  }

  return normalizer(body);
}

export async function fetchHealth(): Promise<NormalizedHealth> {
  return request('/health', { method: 'GET' }, (raw) => normalizeHealthResponse(raw));
}

export async function importWhatsAppChat(
  payload: WhatsAppImportRequest
): Promise<NormalizedImportResult> {
  return request(
    '/api/v1/whatsapp/import',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    normalizeImportResponse
  );
}

export async function importWhatsAppFile(
  projectId: string,
  file: File
): Promise<NormalizedImportResult> {
  const formData = new FormData();
  formData.append('project_id', projectId);
  formData.append('file', file);

  return request(
    '/api/v1/whatsapp/import-file',
    {
      method: 'POST',
      body: formData,
    },
    normalizeImportResponse
  );
}

export interface FetchDailyReportParams {
  project_id: string;
  date?: string;
  format?: 'json' | 'markdown';
}

export async function fetchDailyReport(
  params: FetchDailyReportParams
): Promise<NormalizedDailyReport> {
  const search = new URLSearchParams();
  search.set('project_id', params.project_id);
  if (params.date) {
    search.set('date', params.date);
  }
  if (params.format === 'markdown') {
    search.set('format', 'markdown');
  }

  return request(
    `/api/v1/reports/daily?${search.toString()}`,
    { method: 'GET' },
    normalizeDailyReport
  );
}

export async function fetchProjectState(
  projectId: string,
  includeHistory = false
): Promise<NormalizedProjectState> {
  const encodedId = encodeURIComponent(projectId.trim());
  const search = new URLSearchParams();
  search.set('include_history', includeHistory ? 'true' : 'false');

  return request(
    `/api/v1/projects/${encodedId}/state?${search.toString()}`,
    { method: 'GET' },
    normalizeProjectState
  );
}

export async function recomputeMilestones(
  projectId: string
): Promise<NormalizedRecomputeResult> {
  const encodedId = encodeURIComponent(projectId.trim());
  return request(
    `/api/v1/projects/${encodedId}/milestones/recompute`,
    { method: 'POST' },
    normalizeRecomputeResponse
  );
}
