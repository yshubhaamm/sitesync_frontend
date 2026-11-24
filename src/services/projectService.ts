import type { NormalizedProjectState, NormalizedRecomputeResult } from '../types/api';
import { normalizeProjectState, normalizeRecomputeResponse } from '../utils/apiAdapters';
import { apiRequest } from './apiClient';

/**
 * GET /api/v1/projects/{project_id}/state — Read-only project milestone state and optional history.
 */
export async function fetchProjectState(
  projectId: string,
  includeHistory = false
): Promise<NormalizedProjectState> {
  const encodedId = encodeURIComponent(projectId.trim());
  const search = new URLSearchParams();
  search.set('include_history', includeHistory ? 'true' : 'false');

  return apiRequest(
    `/api/v1/projects/${encodedId}/state?${search.toString()}`,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
    normalizeProjectState
  );
}

/**
 * POST /api/v1/projects/{project_id}/milestones/recompute — Rebuild derived milestone state from stored events.
 */
export async function recomputeMilestones(
  projectId: string
): Promise<NormalizedRecomputeResult> {
  const encodedId = encodeURIComponent(projectId.trim());
  return apiRequest(
    `/api/v1/projects/${encodedId}/milestones/recompute`,
    {
      method: 'POST',
      headers: { Accept: 'application/json' },
    },
    normalizeRecomputeResponse
  );
}
