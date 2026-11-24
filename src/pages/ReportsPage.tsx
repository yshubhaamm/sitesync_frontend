import React, { useState } from 'react';
import { Calendar, FileText, Loader2, ShieldAlert, Users } from 'lucide-react';
import type {
  ApiErrorInfo,
  NormalizedDailyReport,
  ReportEntryItem,
} from '../types/api';
import { validateProjectId } from '../utils/apiAdapters';
import {
  ApiErrorBanner,
  EmptyState,
  LoadingSkeleton,
  RawResponseDrawer,
} from '../components/StatusFeedback';
import { MarkdownReportView } from '../components/MarkdownReportView';

interface ReportsPageProps {
  projectId: string;
  onProjectIdChange: (projectId: string) => void;
  reportDate: string;
  onReportDateChange: (date: string) => void;
  viewFormat: 'json' | 'markdown';
  onViewFormatChange: (format: 'json' | 'markdown') => void;
  report: NormalizedDailyReport | null;
  loading: boolean;
  error: ApiErrorInfo | null;
  onFetchReport: (
    projectId: string,
    date: string,
    format: 'json' | 'markdown'
  ) => Promise<void>;
}

interface ReportSectionProps {
  title: string;
  items: ReportEntryItem[] | undefined;
  tone?: 'default' | 'success' | 'navy' | 'amber' | 'red';
  emptyText?: string;
}

const TONE_TITLE: Record<NonNullable<ReportSectionProps['tone']>, string> = {
  default: 'text-slate-900',
  success: 'text-[#16A34A]',
  navy: 'text-[#0F294A]',
  amber: 'text-[#D97706]',
  red: 'text-[#DC2626]',
};

function ReportSectionCard({
  title,
  items,
  tone = 'default',
  emptyText = 'None reported.',
}: ReportSectionProps) {
  if (items === undefined) return null;

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <h4 className={`text-sm font-semibold ${TONE_TITLE[tone]}`}>{title}</h4>
        <span className="text-xs font-mono tabular-nums text-slate-500">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <li key={item.id ?? idx} className="py-2.5 first:pt-0 last:pb-0 text-sm space-y-1">
              <div className="flex items-start justify-between gap-3">
                <span className="text-slate-800 font-medium">{item.text}</span>
                {item.progressPct !== undefined && (
                  <span className="font-mono text-xs font-semibold text-[#0F294A] tabular-nums shrink-0">
                    {item.progressPct}%
                  </span>
                )}
              </div>

              {item.evidence && (
                <div className="text-xs font-mono text-slate-500 break-words">
                  &ldquo;{item.evidence}&rdquo;
                </div>
              )}

              {(item.meta || item.milestoneEffect || item.status || item.confidence !== null) && (
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {item.meta && <span>{item.meta}</span>}
                  {item.status && (
                    <>
                      {item.meta && <span aria-hidden="true">·</span>}
                      <span>{item.status}</span>
                    </>
                  )}
                  {item.milestoneEffect && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[#0F294A]">{item.milestoneEffect}</span>
                    </>
                  )}
                  {item.confidence !== undefined && item.confidence !== null && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {Math.round(item.confidence <= 1 ? item.confidence * 100 : item.confidence)}% conf.
                      </span>
                    </>
                  )}
                </div>
              )}

              {item.notes && item.notes.length > 0 && (
                <ul className="list-disc pl-4 text-xs text-slate-600 space-y-0.5">
                  {item.notes.map((n, nIdx) => (
                    <li key={nIdx}>{n}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ReportsPage({
  projectId,
  onProjectIdChange,
  reportDate,
  onReportDateChange,
  viewFormat,
  onViewFormatChange,
  report,
  loading,
  error,
  onFetchReport,
}: ReportsPageProps) {
  const [draftProjectId, setDraftProjectId] = useState(projectId);
  const [validationError, setValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    setDraftProjectId(projectId);
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateProjectId(draftProjectId);
    if (err) {
      setValidationError(err);
      return;
    }
    const trimmed = draftProjectId.trim();
    setValidationError(null);
    onProjectIdChange(trimmed);
    await onFetchReport(trimmed, reportDate, viewFormat);
  };

  const handleSwitchFormat = async (nextFormat: 'json' | 'markdown') => {
    onViewFormatChange(nextFormat);
    const trimmed = draftProjectId.trim();
    if (trimmed && !validateProjectId(trimmed)) {
      await onFetchReport(trimmed, reportDate, nextFormat);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end flex-1 max-w-2xl"
          >
            <div>
              <label
                htmlFor="report-project-id"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Project ID
              </label>
              <input
                id="report-project-id"
                type="text"
                value={draftProjectId}
                onChange={(e) => {
                  setDraftProjectId(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="e.g. demo-site"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F294A] focus:border-[#0F294A]"
              />
            </div>

            <div>
              <label
                htmlFor="report-date"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Report Date (optional)
              </label>
              <input
                id="report-date"
                type="date"
                value={reportDate}
                onChange={(e) => onReportDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F294A] focus:border-[#0F294A]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#0F294A] rounded-md hover:bg-[#163864] disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Fetching...' : 'Fetch Report'}</span>
            </button>
          </form>

          <div
            role="group"
            aria-label="Report format"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-md self-start lg:self-end shrink-0"
          >
            <button
              type="button"
              onClick={() => handleSwitchFormat('json')}
              aria-pressed={viewFormat === 'json'}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                viewFormat === 'json'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Structured JSON
            </button>
            <button
              type="button"
              onClick={() => handleSwitchFormat('markdown')}
              aria-pressed={viewFormat === 'markdown'}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                viewFormat === 'markdown'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Markdown
            </button>
          </div>
        </div>

        {validationError && (
          <p role="alert" className="text-xs font-medium text-[#DC2626]">
            {validationError}
          </p>
        )}
      </section>

      {error && <ApiErrorBanner error={error} title="Failed to Fetch Daily Site Report" />}

      {loading && <LoadingSkeleton rows={5} />}

      {!loading && !error && !report && (
        <EmptyState
          icon={FileText}
          title="No Daily Report Loaded"
          description="Enter a Project ID, optionally select a date (defaults to the latest day with events), and click Fetch Report."
        />
      )}

      {!loading && report && (
        <div className="space-y-6">
          {/* Report Header Bar */}
          {(report.reportDate || report.overallProgressPct !== undefined || report.projectId) && (
            <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    <span>Daily Site Report</span>
                    {(report.projectId || projectId) && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-slate-800">
                          {report.projectId || projectId}
                        </span>
                      </>
                    )}
                    {report.extractionMethod && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{report.extractionMethod}</span>
                      </>
                    )}
                  </div>
                  {report.reportDate && (
                    <div className="flex items-center gap-2 text-lg font-bold font-mono text-slate-900">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <span>{report.reportDate}</span>
                    </div>
                  )}
                </div>

                {report.overallProgressPct !== undefined && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Overall Project Progress</div>
                    <div className="text-2xl font-bold font-mono text-[#0F294A] tabular-nums">
                      {report.overallProgressPct}%
                    </div>
                  </div>
                )}
              </div>

              {report.counts && (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                  <span>
                    Messages:{' '}
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      {report.counts.messages}
                    </span>
                  </span>
                  <span>
                    Accepted events:{' '}
                    <span className="font-mono font-semibold text-[#16A34A] tabular-nums">
                      {report.counts.acceptedEvents}
                    </span>
                  </span>
                  <span>
                    Needs review:{' '}
                    <span className="font-mono font-semibold text-[#D97706] tabular-nums">
                      {report.counts.needsReview}
                    </span>
                  </span>
                  {report.duplicatesIgnored !== undefined && (
                    <span>
                      Duplicates ignored:{' '}
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {report.duplicatesIgnored}
                      </span>
                    </span>
                  )}
                  {report.generatedAt && (
                    <span className="text-slate-400 font-mono">
                      Generated: {report.generatedAt}
                    </span>
                  )}
                </div>
              )}
            </section>
          )}

          {viewFormat === 'markdown' ? (
            <section className="bg-white border border-slate-200 rounded-lg p-6">
              {report.markdown ? (
                <MarkdownReportView markdown={report.markdown} />
              ) : (
                <p className="text-sm text-slate-500">
                  The backend did not return a markdown body for this request. Switch to Structured
                  JSON or inspect the raw response below.
                </p>
              )}
            </section>
          ) : (
            <div className="space-y-6">
              {report.counts &&
                report.counts.acceptedEvents === 0 &&
                report.counts.needsReview === 0 && (
                  <div className="bg-slate-100/80 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                    No chat updates were recorded for {report.reportDate || 'this date'}.
                  </div>
                )}

              {/* Supervisor Review Banner if items exist */}
              {report.needsSupervisorReview && report.needsSupervisorReview.length > 0 && (
                <section className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#D97706]">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      Messages Requiring Supervisor Review ({report.needsSupervisorReview.length})
                    </span>
                  </div>
                  <ul className="divide-y divide-amber-200/70">
                    {report.needsSupervisorReview.map((item, idx) => (
                      <li key={idx} className="py-2.5 first:pt-0 last:pb-0 text-sm text-amber-950 space-y-1">
                        <div className="font-medium font-mono text-xs">&ldquo;{item.text}&rdquo;</div>
                        {item.reason && (
                          <div className="text-xs text-amber-900">{item.reason}</div>
                        )}
                        <div className="text-xs text-amber-800 flex flex-wrap items-center gap-2">
                          {item.kind && <span className="font-mono">{item.kind}</span>}
                          {item.meta && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{item.meta}</span>
                            </>
                          )}
                          {item.flags && item.flags.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono">{item.flags.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Work Progress Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReportSectionCard
                  title="Work Completed"
                  items={report.workCompleted}
                  tone="success"
                />
                <ReportSectionCard
                  title="Work Started"
                  items={report.workStarted}
                  tone="navy"
                />
                <ReportSectionCard
                  title="Work In Progress"
                  items={report.workInProgress}
                  tone="navy"
                />
                <ReportSectionCard
                  title="Planned / Upcoming Work"
                  items={report.plannedWork}
                  tone="default"
                />
              </div>

              {/* Materials Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReportSectionCard
                  title="Materials Received"
                  items={report.materialsReceived}
                  tone="success"
                />
                <ReportSectionCard
                  title="Materials Expected"
                  items={report.materialsExpected}
                  tone="default"
                />
                <ReportSectionCard
                  title="Material Delays or Shortages"
                  items={report.materialDelaysOrShortages}
                  tone="red"
                />
                <ReportSectionCard
                  title="Materials Requested"
                  items={report.materialsRequested}
                  tone="amber"
                />
              </div>

              {/* Labour & Site Issues */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.labour !== undefined && (
                  <section className="bg-white border border-slate-200 rounded-lg p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <h4 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>Labour Updates</span>
                      </h4>
                      <span className="text-xs font-mono tabular-nums text-slate-500">
                        {report.labour.reports} report{report.labour.reports === 1 ? '' : 's'}
                      </span>
                    </div>

                    {(report.labour.maxWorkers !== null || report.labour.latestWorkers !== null) && (
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pb-1">
                        {report.labour.latestWorkers !== null && (
                          <span>
                            Latest workers:{' '}
                            <span className="font-mono font-semibold text-slate-900 tabular-nums">
                              {report.labour.latestWorkers}
                            </span>
                          </span>
                        )}
                        {report.labour.maxWorkers !== null && (
                          <span>
                            Max workers:{' '}
                            <span className="font-mono font-semibold text-slate-900 tabular-nums">
                              {report.labour.maxWorkers}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {report.labour.items.length === 0 ? (
                      <p className="text-xs text-slate-500">None reported.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {report.labour.items.map((item, idx) => (
                          <li key={item.id ?? idx} className="py-2 first:pt-0 last:pb-0 text-sm space-y-1">
                            <div className="text-slate-800 font-medium">{item.text}</div>
                            {item.evidence && (
                              <div className="text-xs font-mono text-slate-500">
                                &ldquo;{item.evidence}&rdquo;
                              </div>
                            )}
                            {item.meta && <div className="text-xs text-slate-500">{item.meta}</div>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}

                <ReportSectionCard
                  title="Important Site Issues"
                  items={report.importantSiteIssues}
                  tone="red"
                />
              </div>

              {report.needsSupervisorReview && report.needsSupervisorReview.length === 0 && (
                <ReportSectionCard
                  title="Messages Requiring Supervisor Review"
                  items={report.needsSupervisorReview}
                  emptyText="No messages awaiting supervisor review."
                />
              )}
            </div>
          )}

          <RawResponseDrawer data={report.raw} label="Inspect /reports/daily Raw Response" />
        </div>
      )}
    </div>
  );
}
