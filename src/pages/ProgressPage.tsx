import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type {
  ApiErrorInfo,
  NormalizedProjectState,
  NormalizedRecomputeResult,
} from '../types/api';
import { recomputeMilestones, SiteSyncApiError } from '../services/sitesyncApi';
import { validateProjectId } from '../utils/apiAdapters';
import {
  ApiErrorBanner,
  EmptyState,
  LoadingSkeleton,
  RawResponseDrawer,
} from '../components/StatusFeedback';

interface ProgressPageProps {
  projectId: string;
  onProjectIdChange: (projectId: string) => void;
  projectState: NormalizedProjectState | null;
  loading: boolean;
  error: ApiErrorInfo | null;
  includeHistory: boolean;
  onIncludeHistoryChange: (include: boolean) => void;
  onFetchState: (projectId: string, includeHistory: boolean) => Promise<void>;
  onAfterRecompute: (
    projectId: string,
    includeHistory: boolean,
    result: NormalizedRecomputeResult
  ) => Promise<void>;
}

function getMilestoneStatusDisplay(status: string, completionPct: number) {
  const s = status.toLowerCase().replace(/[\s-]+/g, '_');
  if (s === 'completed' || completionPct === 100) {
    return {
      label: status,
      badgeClass: 'bg-emerald-50 text-[#16A34A] border-emerald-200',
      barClass: 'bg-[#16A34A]',
    };
  }
  if (s === 'delayed') {
    return {
      label: status,
      badgeClass: 'bg-red-50 text-[#DC2626] border-red-200',
      barClass: 'bg-[#DC2626]',
    };
  }
  if (s === 'in_progress') {
    return {
      label: status,
      badgeClass: 'bg-slate-100 text-[#0F294A] border-slate-300',
      barClass: 'bg-[#0F294A]',
    };
  }
  return {
    label: status,
    badgeClass: 'bg-slate-50 text-slate-600 border-slate-200',
    barClass: 'bg-slate-400',
  };
}

export function ProgressPage({
  projectId,
  onProjectIdChange,
  projectState,
  loading,
  error,
  includeHistory,
  onIncludeHistoryChange,
  onFetchState,
  onAfterRecompute,
}: ProgressPageProps) {
  const [draftProjectId, setDraftProjectId] = useState(projectId);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeError, setRecomputeError] = useState<ApiErrorInfo | null>(null);
  const [recomputeResult, setRecomputeResult] = useState<NormalizedRecomputeResult | null>(null);

  React.useEffect(() => {
    setDraftProjectId(projectId);
  }, [projectId]);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateProjectId(draftProjectId);
    if (err) {
      setValidationError(err);
      return;
    }
    const trimmed = draftProjectId.trim();
    setValidationError(null);
    setRecomputeError(null);
    onProjectIdChange(trimmed);
    await onFetchState(trimmed, includeHistory);
  };

  const handleToggleHistory = async () => {
    const next = !includeHistory;
    onIncludeHistoryChange(next);
    const trimmed = draftProjectId.trim();
    if (trimmed && !validateProjectId(trimmed)) {
      await onFetchState(trimmed, next);
    }
  };

  const handleRecompute = async () => {
    const err = validateProjectId(draftProjectId);
    if (err) {
      setValidationError(err);
      return;
    }
    if (recomputing) return;

    const trimmed = draftProjectId.trim();
    setValidationError(null);
    setRecomputeError(null);
    setRecomputing(true);
    onProjectIdChange(trimmed);

    try {
      const res = await recomputeMilestones(trimmed);
      setRecomputeResult(res);
      await onAfterRecompute(trimmed, includeHistory, res);
    } catch (errObj) {
      if (errObj instanceof SiteSyncApiError) {
        setRecomputeError(errObj.info);
      } else {
        setRecomputeError({
          kind: 'HTTP_ERROR',
          message: errObj instanceof Error ? errObj.message : 'Failed to recompute milestones.',
        });
      }
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <form
            onSubmit={handleFetch}
            className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5"
          >
            <div>
              <label
                htmlFor="progress-project-id"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Project ID
              </label>
              <input
                id="progress-project-id"
                type="text"
                value={draftProjectId}
                onChange={(e) => {
                  setDraftProjectId(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. demo-site"
                className="w-full sm:w-56 px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F294A] focus:border-[#0F294A]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0F294A] rounded-md hover:bg-[#163864] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Loading...' : 'Load State'}</span>
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={includeHistory}
              onClick={handleToggleHistory}
              disabled={loading}
              className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                includeHistory
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Include History: {includeHistory ? 'On' : 'Off'}</span>
            </button>

            <button
              type="button"
              onClick={handleRecompute}
              disabled={recomputing || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#0F294A] bg-white border border-[#0F294A] rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin' : ''}`} />
              <span>{recomputing ? 'Recomputing...' : 'Recompute Milestones'}</span>
            </button>
          </div>
        </div>

        {validationError && (
          <p role="alert" className="text-xs font-medium text-[#DC2626]">
            {validationError}
          </p>
        )}
      </section>

      {recomputeError && (
        <ApiErrorBanner error={recomputeError} title="Milestone Recompute Failed" />
      )}

      {recomputeResult && (
        <section className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#16A34A]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Milestones Recomputed</span>
            </div>
            <div className="text-xs font-mono text-emerald-900 flex items-center gap-3">
              <span>Changes: {recomputeResult.milestoneChanges.length}</span>
              {recomputeResult.projectState && (
                <span>Overall: {recomputeResult.projectState.overallProgressPct}%</span>
              )}
            </div>
          </div>

          {recomputeResult.milestoneChanges.length === 0 ? (
            <p className="text-xs text-emerald-900">
              Milestone states and history were rebuilt from stored events with no changes needed.
            </p>
          ) : (
            <div className="bg-white border border-emerald-200 rounded-md divide-y divide-emerald-100">
              {recomputeResult.milestoneChanges.map((c, idx) => (
                <div
                  key={c.milestoneId ?? idx}
                  className="px-3 py-2 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-slate-900">{c.milestoneName}</span>
                  <span className="font-mono tabular-nums text-slate-700 inline-flex items-center gap-1.5">
                    {c.previousStatus && <span className="text-slate-500">{c.previousStatus}</span>}
                    {c.previousPct !== undefined && <span>({c.previousPct}%)</span>}
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    {c.newStatus && <span className="font-semibold text-[#0F294A]">{c.newStatus}</span>}
                    {c.newPct !== undefined && (
                      <span className="font-semibold text-[#16A34A]">({c.newPct}%)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          <RawResponseDrawer data={recomputeResult.raw} label="Inspect Recompute API Response" />
        </section>
      )}

      {error && <ApiErrorBanner error={error} title="Failed to Load Project State" />}

      {loading && <LoadingSkeleton rows={5} />}

      {!loading && !error && !projectState && (
        <EmptyState
          icon={BarChart3}
          title="No Milestone State Loaded"
          description="Enter a Project ID above and click Load State to inspect milestone progress and historical changes."
        />
      )}

      {!loading && projectState && (
        <div className="space-y-6">
          {/* Overall Summary */}
          <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Overall Progress{projectState.projectId ? ` · ${projectState.projectId}` : ''}
                </h3>
                {projectState.eventsTotal !== undefined && (
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    Events: {projectState.eventsTotal} · Pending review:{' '}
                    {projectState.eventsPendingReview ?? 0} · Not understood:{' '}
                    {projectState.messagesNotUnderstood ?? 0}
                    {projectState.generalDelayEvents
                      ? ` · General delays: ${projectState.generalDelayEvents}`
                      : ''}
                  </p>
                )}
              </div>
              <div className="text-3xl font-bold font-mono text-[#0F294A] tabular-nums">
                {projectState.overallProgressPct}%
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0F294A] transition-all duration-300"
                  style={{
                    width: `${Math.min(100, Math.max(0, projectState.overallProgressPct))}%`,
                  }}
                />
              </div>
              {projectState.progressNote && (
                <p className="text-xs text-slate-500">{projectState.progressNote}</p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2 border-t border-slate-100">
              <div>
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  {projectState.totalMilestones}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Completed</div>
                <div className="text-xl font-bold font-mono tabular-nums text-[#16A34A]">
                  {projectState.completedMilestones}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">In Progress</div>
                <div className="text-xl font-bold font-mono tabular-nums text-[#0F294A]">
                  {projectState.inProgressMilestones}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Delayed</div>
                <div className="text-xl font-bold font-mono tabular-nums text-[#DC2626]">
                  {projectState.delayedMilestones}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Not Started</div>
                <div className="text-xl font-bold font-mono tabular-nums text-slate-600">
                  {projectState.notStartedMilestones}
                </div>
              </div>
            </div>
          </section>

          {/* Milestones List */}
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Milestones ({projectState.milestones.length})
              </h3>
            </div>

            {projectState.milestones.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 text-center">
                No milestones returned for this project.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                    <tr>
                      <th className="px-5 py-2.5">Milestone</th>
                      <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
                      <th className="px-4 py-2.5 min-w-[180px]">Completion</th>
                      <th className="px-5 py-2.5">Notes &amp; Scopes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {projectState.milestones.map((m) => {
                      const style = getMilestoneStatusDisplay(m.status, m.completionPct);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70 align-top">
                          <td className="px-5 py-3 font-medium text-slate-900">
                            <div>{m.name}</div>
                            {(m.startedAt || m.completedAt) && (
                              <div className="text-xs text-slate-400 font-mono mt-0.5 space-x-2">
                                {m.startedAt && <span>Started: {m.startedAt}</span>}
                                {m.completedAt && <span>Completed: {m.completedAt}</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${style.badgeClass}`}
                            >
                              {style.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${style.barClass}`}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, m.completionPct))}%`,
                                  }}
                                />
                              </div>
                              <span className="font-mono text-xs font-semibold tabular-nums text-slate-800 w-12 text-right">
                                {m.completionPct}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600 max-w-md space-y-1">
                            {m.scopesCompleted.length > 0 && (
                              <div className="text-slate-700">
                                Scopes completed: {m.scopesCompleted.join(', ')}
                              </div>
                            )}
                            {m.notes.length > 0 ? (
                              <ul className="list-disc pl-4 space-y-0.5">
                                {m.notes.map((note, idx) => (
                                  <li key={idx}>{note}</li>
                                ))}
                              </ul>
                            ) : (
                              m.scopesCompleted.length === 0 && (
                                <span className="text-slate-400">—</span>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Unmapped Activities if present */}
          {projectState.unmappedActivities.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Unmapped Activities ({projectState.unmappedActivities.length})
              </h3>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                {projectState.unmappedActivities.map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Historical Milestone Changes */}
          {includeHistory && (
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Historical Milestone Changes
                  {projectState.history ? ` (${projectState.history.length})` : ''}
                </h3>
              </div>

              {!projectState.history || projectState.history.length === 0 ? (
                <div className="p-6 text-sm text-slate-500 text-center">
                  No historical milestone changes returned by the backend.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {projectState.history.map((entry) => (
                    <div
                      key={entry.id}
                      className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-slate-900">{entry.milestoneName}</div>
                        {entry.note && <div className="text-xs text-slate-600">{entry.note}</div>}
                        {entry.changedAt && (
                          <div className="text-xs font-mono text-slate-400">{entry.changedAt}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 font-mono text-xs tabular-nums shrink-0">
                        {entry.previousStatus && (
                          <span className="text-slate-500">{entry.previousStatus}</span>
                        )}
                        {entry.previousPct !== undefined && (
                          <span className="text-slate-500">({entry.previousPct}%)</span>
                        )}
                        {(entry.previousStatus || entry.previousPct !== undefined) && (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        {entry.newStatus && (
                          <span className="font-semibold text-[#0F294A]">{entry.newStatus}</span>
                        )}
                        {entry.newPct !== undefined && (
                          <span className="font-semibold text-[#16A34A]">({entry.newPct}%)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <RawResponseDrawer data={projectState.raw} label="Inspect /state Raw API Response" />
        </div>
      )}
    </div>
  );
}
