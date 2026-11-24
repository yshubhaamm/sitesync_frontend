import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  FileText,
  FolderSearch,
  MessageSquarePlus,
  Server,
} from 'lucide-react';
import type {
  ApiErrorInfo,
  NavSection,
  NormalizedHealth,
  NormalizedImportResult,
  NormalizedProjectState,
} from '../types/api';
import { validateProjectId } from '../utils/apiAdapters';
import {
  ApiErrorBanner,
  EmptyState,
  LoadingSkeleton,
  RawResponseDrawer,
} from '../components/StatusFeedback';

interface DashboardPageProps {
  projectId: string;
  onProjectIdSubmit: (newProjectId: string) => void;
  health: NormalizedHealth | null;
  healthLoading: boolean;
  healthError: ApiErrorInfo | null;
  projectState: NormalizedProjectState | null;
  projectLoading: boolean;
  projectError: ApiErrorInfo | null;
  onLoadProjectState: (projectId: string) => void;
  lastImportResult: NormalizedImportResult | null;
  onNavigate: (section: NavSection) => void;
}

export function DashboardPage({
  projectId,
  onProjectIdSubmit,
  health,
  healthLoading,
  healthError,
  projectState,
  projectLoading,
  projectError,
  onLoadProjectState,
  lastImportResult,
  onNavigate,
}: DashboardPageProps) {
  const [draftProjectId, setDraftProjectId] = useState(projectId);
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    setDraftProjectId(projectId);
  }, [projectId]);

  const handleLoadProject = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateProjectId(draftProjectId);
    if (err) {
      setFormError(err);
      return;
    }
    const trimmed = draftProjectId.trim();
    setFormError(null);
    onProjectIdSubmit(trimmed);
    onLoadProjectState(trimmed);
  };

  const isNotCreatedYet = projectError?.code === 'project_not_found';

  return (
    <div className="space-y-6">
      {/* Page Header & Active Project Selector */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Construction Site Operations Overview
            </h2>
            <p className="text-sm text-slate-600">
              Connect WhatsApp field chats to automated milestone tracking and daily site reports.
            </p>
          </div>

          <form
            onSubmit={handleLoadProject}
            className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 shrink-0"
          >
            <div>
              <label
                htmlFor="dashboard-project-id"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Active Project ID
              </label>
              <input
                id="dashboard-project-id"
                type="text"
                value={draftProjectId}
                onChange={(e) => {
                  setDraftProjectId(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="e.g. demo-site"
                className="w-full sm:w-52 px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F294A] focus:border-[#0F294A]"
              />
            </div>
            <button
              type="submit"
              disabled={projectLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0F294A] rounded-md hover:bg-[#163864] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {projectLoading ? 'Loading...' : 'Load Project State'}
            </button>
          </form>
        </div>

        {formError && (
          <p role="alert" className="text-xs text-[#DC2626] font-medium">
            {formError}
          </p>
        )}
      </section>

      {/* Backend & Database Health Section */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Backend &amp; Database Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status from <span className="font-mono">GET /health</span>
            </p>
          </div>
          {health?.checkedAt && (
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Checked {new Date(health.checkedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {healthError && <ApiErrorBanner error={healthError} title="Health Check Failed" />}

        {healthLoading && !health && <LoadingSkeleton rows={2} />}

        {health && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Server className="w-3.5 h-3.5" />
                  <span>Backend API</span>
                </div>
                <div
                  className={`text-sm font-semibold flex items-center gap-1.5 ${
                    health.statusLabel === 'degraded'
                      ? 'text-[#D97706]'
                      : health.online
                        ? 'text-[#16A34A]'
                        : 'text-[#DC2626]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {health.statusLabel === 'degraded'
                      ? 'Degraded'
                      : health.online
                        ? `Online (${health.statusLabel})`
                        : 'Offline'}
                  </span>
                </div>
                {health.version && (
                  <div className="text-xs font-mono text-slate-500">v{health.version}</div>
                )}
              </div>

              <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Database className="w-3.5 h-3.5" />
                  <span>SQLite Database</span>
                </div>
                <div
                  className={`text-sm font-semibold ${
                    health.databaseConnected === true
                      ? 'text-[#16A34A]'
                      : health.databaseConnected === false
                        ? 'text-[#DC2626]'
                        : 'text-slate-700'
                  }`}
                >
                  {health.databaseConnected === true
                    ? 'Connected'
                    : health.databaseConnected === false
                      ? 'Disconnected'
                      : 'Not reported'}
                </div>
                {health.databaseError && (
                  <div className="text-xs text-[#DC2626] break-words">{health.databaseError}</div>
                )}
              </div>

              <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="text-xs text-slate-500">DB Schema Version</div>
                <div className="text-sm font-semibold font-mono text-slate-900 tabular-nums">
                  {health.schemaVersion !== undefined ? String(health.schemaVersion) : 'Not reported'}
                </div>
                {health.expectedSchemaVersion !== undefined && (
                  <div className="text-xs font-mono text-slate-500">
                    Expected: {health.expectedSchemaVersion}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>LLM Extraction</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {health.llmEnabled === true
                    ? 'Enabled'
                    : health.llmEnabled === false
                      ? 'Disabled (Rules mode)'
                      : 'Not reported'}
                </div>
                {health.llmConfigured !== undefined && (
                  <div className="text-xs text-slate-500">
                    Configured: {health.llmConfigured ? 'Yes' : 'No'}
                  </div>
                )}
              </div>
            </div>

            {health.llmNote && (
              <p className="text-xs text-slate-500">{health.llmNote}</p>
            )}

            <RawResponseDrawer data={health.raw} label="Inspect /health JSON" />
          </div>
        )}
      </section>

      {/* Project Progress & Milestone Summary */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            Project Progress &amp; Milestone Summary
          </h3>
          {projectId.trim() && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('progress')}
                className="text-xs font-medium text-[#0F294A] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>Open Project Progress</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {projectError && !isNotCreatedYet && (
          <ApiErrorBanner
            error={projectError}
            title={`Could not load project "${projectId.trim()}"`}
          />
        )}

        {projectLoading && <LoadingSkeleton rows={3} />}

        {!projectLoading && isNotCreatedYet && (
          <EmptyState
            icon={FolderSearch}
            title={`No data yet for "${projectId.trim()}"`}
            description={
              projectError.message ||
              'Projects are created automatically on their first WhatsApp import. Import a chat to start tracking milestones.'
            }
            action={
              <button
                type="button"
                onClick={() => onNavigate('import')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F294A] rounded-md hover:bg-[#163864]"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>Import Chat for {projectId.trim()}</span>
              </button>
            }
          />
        )}

        {!projectLoading && !projectError && !projectState && (
          <EmptyState
            icon={FolderSearch}
            title="No Project Loaded"
            description="Enter a known Project ID above and click Load Project State, or import a WhatsApp chat export to automatically create a project."
            action={
              <button
                type="button"
                onClick={() => onNavigate('import')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F294A] rounded-md hover:bg-[#163864]"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>Go to WhatsApp Import</span>
              </button>
            }
          />
        )}

        {!projectLoading && projectState && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500">Project ID</div>
                <div className="text-base font-bold font-mono text-slate-900">
                  {projectState.projectId || projectId}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Overall Project Progress</div>
                <div className="text-2xl font-bold font-mono text-[#0F294A] tabular-nums">
                  {projectState.overallProgressPct}%
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#0F294A] h-full transition-all duration-300"
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
                <div className="text-xs text-slate-500">Total Milestones</div>
                <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {projectState.totalMilestones}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Completed</div>
                <div className="text-xl font-bold font-mono text-[#16A34A] tabular-nums">
                  {projectState.completedMilestones}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">In Progress</div>
                <div className="text-xl font-bold font-mono text-[#0F294A] tabular-nums">
                  {projectState.inProgressMilestones}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Delayed</div>
                <div className="text-xl font-bold font-mono text-[#DC2626] tabular-nums">
                  {projectState.delayedMilestones}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Not Started</div>
                <div className="text-xl font-bold font-mono text-slate-600 tabular-nums">
                  {projectState.notStartedMilestones}
                </div>
              </div>
            </div>

            {(projectState.eventsTotal !== undefined ||
              projectState.eventsPendingReview !== undefined ||
              projectState.messagesNotUnderstood !== undefined) && (
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                {projectState.eventsTotal !== undefined && (
                  <span>
                    Total events:{' '}
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {projectState.eventsTotal}
                    </span>
                  </span>
                )}
                {projectState.eventsPendingReview !== undefined && (
                  <span>
                    Pending review:{' '}
                    <span className="font-mono font-semibold text-[#D97706] tabular-nums">
                      {projectState.eventsPendingReview}
                    </span>
                  </span>
                )}
                {projectState.messagesNotUnderstood !== undefined && (
                  <span>
                    Not understood:{' '}
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {projectState.messagesNotUnderstood}
                    </span>
                  </span>
                )}
              </div>
            )}

            {projectState.milestones.length > 0 && (
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="text-xs font-medium text-slate-500">
                  Milestones ({projectState.milestones.length})
                </div>
                <div className="divide-y divide-slate-100">
                  {projectState.milestones.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="py-2 flex items-center justify-between gap-4 text-sm"
                    >
                      <span className="font-medium text-slate-800 truncate">{m.name}</span>
                      <div className="flex items-center gap-3 shrink-0 font-mono text-xs tabular-nums">
                        <span className="text-slate-600">{m.status}</span>
                        <span className="font-semibold text-slate-900">{m.completionPct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Recent Session Import Result */}
      {lastImportResult && (
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Recent WhatsApp Import (Current Session)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Project:{' '}
                <span className="font-mono text-slate-800">
                  {lastImportResult.projectId || projectId}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('import')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap"
              >
                View Full Import
              </button>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#0F294A] rounded-md hover:bg-[#163864] whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Daily Report</span>
              </button>
            </div>
          </div>

          {(lastImportResult.dateOrderAmbiguous || lastImportResult.warnings.length > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
              <span>
                {lastImportResult.warnings[0] ||
                  'Date order ambiguity detected during import. Review extracted dates.'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {lastImportResult.messagesParsed !== undefined && (
              <div>
                <div className="text-xs text-slate-500">Messages Parsed</div>
                <div className="text-lg font-bold font-mono tabular-nums">
                  {lastImportResult.messagesParsed}
                </div>
              </div>
            )}
            {lastImportResult.acceptedEventsCount !== undefined && (
              <div>
                <div className="text-xs text-slate-500">Accepted Events</div>
                <div className="text-lg font-bold font-mono text-[#16A34A] tabular-nums">
                  {lastImportResult.acceptedEventsCount}
                </div>
              </div>
            )}
            {lastImportResult.needsReviewCount !== undefined && (
              <div>
                <div className="text-xs text-slate-500">Needs Review</div>
                <div className="text-lg font-bold font-mono text-[#D97706] tabular-nums">
                  {lastImportResult.needsReviewCount}
                </div>
              </div>
            )}
            {lastImportResult.duplicatesIgnoredCount !== undefined && (
              <div>
                <div className="text-xs text-slate-500">Duplicates Ignored</div>
                <div className="text-lg font-bold font-mono text-slate-700 tabular-nums">
                  {lastImportResult.duplicatesIgnoredCount}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Quick Workflow Links */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('import')}
          className="text-left bg-white border border-slate-200 rounded-lg p-4 hover:border-[#0F294A] transition-colors space-y-1.5"
        >
          <div className="flex items-center justify-between text-[#0F294A]">
            <MessageSquarePlus className="w-4 h-4" />
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="text-sm font-semibold text-slate-900">Import WhatsApp Updates</div>
          <p className="text-xs text-slate-500">
            Paste site chat messages or upload exported .txt logs for event extraction.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('progress')}
          className="text-left bg-white border border-slate-200 rounded-lg p-4 hover:border-[#0F294A] transition-colors space-y-1.5"
        >
          <div className="flex items-center justify-between text-[#0F294A]">
            <BarChart3 className="w-4 h-4" />
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="text-sm font-semibold text-slate-900">Track &amp; Recompute Milestones</div>
          <p className="text-xs text-slate-500">
            Inspect milestone percentages, view change history, or recompute states.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('reports')}
          className="text-left bg-white border border-slate-200 rounded-lg p-4 hover:border-[#0F294A] transition-colors space-y-1.5"
        >
          <div className="flex items-center justify-between text-[#0F294A]">
            <FileText className="w-4 h-4" />
            <ArrowRight className="w-4 h-4" />
          </div>
          <div className="text-sm font-semibold text-slate-900">Generate Daily Site Report</div>
          <p className="text-xs text-slate-500">
            View structured JSON or Markdown reports by project ID and date.
          </p>
        </button>
      </section>
    </div>
  );
}
