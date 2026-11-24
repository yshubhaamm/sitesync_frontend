import type { NormalizedDailyReport } from '../types/api';
import { normalizeDailyReport } from '../utils/apiAdapters';
import { apiRequest } from './apiClient';

export interface FetchDailyReportParams {
  project_id: string;
  date?: string;
  format?: 'json' | 'markdown';
}

/**
 * GET /api/v1/reports/daily — Fetch daily site report in JSON or text/markdown format.
 */
export async function fetchDailyReport(
  params: FetchDailyReportParams
): Promise<NormalizedDailyReport> {
  const search = new URLSearchParams();
  search.set('project_id', params.project_id.trim());
  if (params.date && params.date.trim()) {
    search.set('date', params.date.trim());
  }
  const format = params.format ?? 'json';
  if (format === 'markdown') {
    search.set('format', 'markdown');
  }

  return apiRequest(
    `/api/v1/reports/daily?${search.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: format === 'markdown' ? 'text/markdown, text/plain' : 'application/json',
      },
    },
    normalizeDailyReport
  );
}
