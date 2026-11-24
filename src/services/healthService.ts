import type { NormalizedHealth } from '../types/api';
import { normalizeHealthResponse } from '../utils/apiAdapters';
import { apiRequest } from './apiClient';

/**
 * GET /health — Read-only connectivity, database, and LLM status check.
 */
export async function fetchHealth(): Promise<NormalizedHealth> {
  return apiRequest(
    '/health',
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
    (raw) => normalizeHealthResponse(raw)
  );
}
