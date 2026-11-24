import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CopyCheck,
  HelpCircle,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import type { EventCategory, NormalizedImportResult } from '../types/api';
import { RawResponseDrawer } from './StatusFeedback';

interface ImportResultViewProps {
  result: NormalizedImportResult;
  onNavigateToReports?: () => void;
  onNavigateToProgress?: () => void;
}

const CATEGORY_STYLES: Record<
  EventCategory,
  {
    label: string;
    textClass: string;
    bgClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  accepted: {
    label: 'Accepted',
    textClass: 'text-[#16A34A]',
    bgClass: 'bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
  },
  needs_review: {
    label: 'Needs review',
    textClass: 'text-[#D97706]',
    bgClass: 'bg-amber-50 border-amber-200',
    icon: ShieldAlert,
  },
  not_understood: {
    label: 'Not understood',
    textClass: 'text-slate-600',
    bgClass: 'bg-slate-100 border-slate-200',
    icon: HelpCircle,
  },
  duplicate_ignored: {
    label: 'Duplicate ignored',
    textClass: 'text-slate-600',
    bgClass: 'bg-slate-100 border-slate-200',
    icon: CopyCheck,
  },
  possible_duplicate: {
    label: 'Possible duplicate',
    textClass: 'text-[#D97706]',
    bgClass: 'bg-amber-50 border-amber-200',
    icon: Layers,
  },
};

export function ImportResultView({
  result,
  onNavigateToReports,
  onNavigateToProgress,
}: ImportResultViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');

  const summaryItems: Array<{ label: string; value: number | string | undefined; tone?: string }> = [
    { label: 'Messages parsed', value: result.messagesParsed },
    { label: 'Accepted events', value: result.acceptedEventsCount, tone: 'text-[#16A34A]' },
    { label: 'Needs review', value: result.needsReviewCount, tone: 'text-[#D97706]' },
    { label: 'Not understood', value: result.notUnderstoodCount, tone: 'text-slate-700' },
    { label: 'Duplicates ignored', value: result.duplicatesIgnoredCount, tone: 'text-slate-700' },
    { label: 'Possible duplicates', value: result.possibleDuplicatesCount, tone: 'text-[#D97706]' },
  ].filter((item) => item.value !== undefined);

  const secondaryMetrics: Array<{ label: string; value: number | string | undefined }> = [
    { label: 'Processed', value: result.processedMessages },
    { label: 'Already imported', value: result.alreadyImportedMessages },
    { label: 'System messages', value: result.systemMessages },
    { label: 'Media / deleted', value: result.mediaDeletedMessages },
    { label: 'No timestamp', value: result.noTimestampMessages },
    { label: 'Events created', value: result.eventsCreated },
    { label: 'Extraction mode', value: result.llmExtractionMode },
    { label: 'Date order', value: result.dateOrder?.toUpperCase() },
  ].filter((item) => item.value !== undefined);

  const filteredEvents =
    categoryFilter === 'all'
      ? result.events
      : result.events.filter((ev) => ev.category === categoryFilter);

  const presentCategories = Array.from(new Set(result.events.map((e) => e.category)));

  return (
    <div className="space-y-6">
      {/* Date Ambiguity & Backend Warnings Banner */}
      {(result.dateOrderAmbiguous || result.warnings.length > 0) && (
        <div
          role="status"
          className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-950 space-y-2"
        >
          <div className="flex items-center gap-2 font-semibold text-[#D97706]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {result.dateOrderAmbiguous
                ? 'Date Order Ambiguity & Import Warnings'
                : 'Backend Warnings'}
            </span>
          </div>
          {result.dateOrderAmbiguous && (
            <p className="text-xs text-amber-900">
              Backend flagged <span className="font-mono font-medium">date_order_ambiguous = true</span>
              {result.dateOrder ? ` (assumed ${result.dateOrder.toUpperCase()})` : ''}. Verify extracted
              dates before finalizing site reports.
            </p>
          )}
          {result.warnings.length > 0 && (
            <ul className="list-disc pl-5 space-y-1 text-xs text-amber-900">
              {result.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Primary Import Summary Grid */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Import Summary</h3>
            <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
              {result.projectId && (
                <span>
                  Project: <span className="font-mono text-slate-800">{result.projectId}</span>
                </span>
              )}
              {result.batchId !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Batch <span className="font-mono text-slate-800">#{result.batchId}</span>
                  </span>
                </>
              )}
              {result.source && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Source: <span className="font-mono text-slate-800">{result.source}</span>
                    {result.filename ? ` (${result.filename})` : ''}
                  </span>
                </>
              )}
              {result.affectedDates.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Dates affected:{' '}
                    <span className="font-mono text-slate-800">
                      {result.affectedDates.join(', ')}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToProgress && (
              <button
                type="button"
                onClick={onNavigateToProgress}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap"
              >
                View Milestones
              </button>
            )}
            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#0F294A] rounded-md hover:bg-[#163864] whitespace-nowrap"
              >
                Open Daily Report
              </button>
            )}
          </div>
        </div>

        {summaryItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {summaryItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="text-xs text-slate-500">{item.label}</div>
                <div
                  className={`text-2xl font-bold font-mono tabular-nums ${item.tone ?? 'text-slate-900'}`}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Import completed. Inspect the response details below.
          </p>
        )}

        {secondaryMetrics.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
            {secondaryMetrics.map((m) => (
              <div key={m.label} className="flex items-center gap-1.5">
                <span className="text-slate-500">{m.label}:</span>
                <span className="font-mono font-medium text-slate-900 tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Extracted Events & Review Items from Latest Report */}
      {result.events.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Extracted Events &amp; Review Items ({filteredEvents.length})
              </h3>
              {result.latestReport?.reportDate && (
                <p className="text-xs text-slate-500 mt-0.5">
                  From latest touched day:{' '}
                  <span className="font-mono text-slate-700">{result.latestReport.reportDate}</span>
                </p>
              )}
            </div>

            {presentCategories.length > 1 && (
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    categoryFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({result.events.length})
                </button>
                {presentCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {CATEGORY_STYLES[cat].label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 whitespace-nowrap">Classification</th>
                  <th className="px-4 py-2.5">Message / Extracted Event</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Milestone / Type</th>
                  <th className="px-4 py-2.5 text-right whitespace-nowrap">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEvents.map((ev, idx) => {
                  const style = CATEGORY_STYLES[ev.category];
                  const Icon = style.icon;
                  return (
                    <tr key={ev.id ?? idx} className="hover:bg-slate-50/70 align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border ${style.bgClass} ${style.textClass}`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{style.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 space-y-1 min-w-[260px]">
                        <div className="text-slate-900 font-medium">
                          {ev.summary || ev.rawMessage || 'No message text'}
                        </div>
                        {ev.rawMessage && ev.summary && ev.rawMessage !== ev.summary && (
                          <div className="text-xs text-slate-500 font-mono break-words">
                            &ldquo;{ev.rawMessage}&rdquo;
                          </div>
                        )}
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                          {ev.sender && <span>{ev.sender}</span>}
                          {ev.timestamp && (
                            <>
                              {ev.sender && <span aria-hidden="true">·</span>}
                              <span className="font-mono">{ev.timestamp}</span>
                            </>
                          )}
                          {ev.extractionMethod && (
                            <>
                              {(ev.sender || ev.timestamp) && <span aria-hidden="true">·</span>}
                              <span className="font-mono">{ev.extractionMethod}</span>
                            </>
                          )}
                          {ev.flags && ev.flags.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-slate-600">
                                {ev.flags.join(', ')}
                              </span>
                            </>
                          )}
                        </div>
                        {ev.reason && (
                          <div className="text-xs text-[#D97706]">{ev.reason}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                        <div className="font-medium">{ev.milestoneName || ev.eventType || '—'}</div>
                        {ev.milestoneEffect && (
                          <div className="text-slate-500 font-mono mt-0.5">{ev.milestoneEffect}</div>
                        )}
                        {!ev.milestoneEffect && ev.milestoneName && ev.eventType && (
                          <div className="text-slate-500 mt-0.5">{ev.eventType}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-slate-700 whitespace-nowrap">
                        {ev.confidence !== undefined ? (
                          <span>
                            {Math.round(ev.confidence <= 1 ? ev.confidence * 100 : ev.confidence)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Milestone Changes */}
      {result.milestoneChanges.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">
              Milestone Changes ({result.milestoneChanges.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200">
            {result.milestoneChanges.map((change, idx) => (
              <div
                key={change.milestoneId ?? idx}
                className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
              >
                <div className="font-medium text-slate-900">{change.milestoneName}</div>
                <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                  {change.previousStatus && (
                    <span className="text-slate-500">{change.previousStatus}</span>
                  )}
                  {change.previousPct !== undefined && (
                    <span className="text-slate-500">({change.previousPct}%)</span>
                  )}
                  {(change.previousStatus || change.previousPct !== undefined) && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {change.newStatus && (
                    <span className="font-semibold text-[#0F294A]">{change.newStatus}</span>
                  )}
                  {change.newPct !== undefined && (
                    <span className="font-semibold text-[#16A34A]">({change.newPct}%)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Embedded Project State returned by import endpoint */}
      {result.projectState && (
        <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">
            Updated Project State (Returned in Import Response)
          </h3>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <span className="text-slate-500">Overall Progress: </span>
              <span className="font-mono font-bold text-[#0F294A] tabular-nums">
                {result.projectState.overallProgressPct}%
              </span>
            </div>
            <div>
              <span className="text-slate-500">Milestones: </span>
              <span className="font-mono font-semibold tabular-nums">
                {result.projectState.completedMilestones} completed ·{' '}
                {result.projectState.inProgressMilestones} in progress ·{' '}
                {result.projectState.delayedMilestones} delayed ·{' '}
                {result.projectState.notStartedMilestones} not started
              </span>
            </div>
          </div>
          {result.projectState.progressNote && (
            <p className="text-xs text-slate-500">{result.projectState.progressNote}</p>
          )}
        </section>
      )}

      <RawResponseDrawer data={result.raw} label="Inspect Raw Import API Response" />
    </div>
  );
}
