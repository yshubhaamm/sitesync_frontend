import type {
  ApiErrorInfo,
  EventCategory,
  NormalizedDailyReport,
  NormalizedExtractedEvent,
  NormalizedHealth,
  NormalizedImportResult,
  NormalizedLabourSection,
  NormalizedMilestone,
  NormalizedMilestoneChange,
  NormalizedMilestoneHistoryEntry,
  NormalizedProjectState,
  NormalizedRecomputeResult,
  ReportEntryItem,
} from '../types/api';

export const PROJECT_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

export function validateProjectId(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Project ID is required (letters, numbers, hyphens, or underscores, up to 64 characters).';
  }
  if (!PROJECT_ID_REGEX.test(trimmed)) {
    return 'Invalid Project ID. Use 1–64 characters: letters, numbers, hyphens (-), or underscores (_).';
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumber(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toStringVal(val: unknown): string | undefined {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  return undefined;
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => (typeof item === 'string' ? item : String(item)))
    .filter((s) => s.trim().length > 0);
}

/**
 * Formats FastAPI errors matching all verified shapes in Section 4 of API_CONTRACT.md:
 * - Application errors (404 / 413 / 422): { detail: { code, message } }
 * - FastAPI validation errors (422): { detail: [{ type, loc, msg, ... }] }
 * - Plain-text 500 Internal Server Error
 * - Network / CORS failures (status === undefined)
 */
export function formatApiError(
  status: number | undefined,
  body: unknown,
  fallbackMessage?: string
): ApiErrorInfo {
  if (status === undefined) {
    return {
      kind: 'NETWORK_OR_CORS',
      message:
        fallbackMessage ||
        'Unable to reach the FastAPI backend. Ensure uvicorn is running on http://127.0.0.1:8000 and CORS allows this frontend origin.',
      raw: body,
    };
  }

  let message = fallbackMessage || `Request failed with HTTP ${status}`;
  let code: string | undefined;
  const details: string[] = [];

  if (typeof body === 'string' && body.trim().length > 0) {
    message = body.trim();
  } else if (isRecord(body)) {
    const detail = body.detail;
    if (isRecord(detail)) {
      // Verified application error shape: { detail: { code, message } }
      code = toStringVal(detail.code);
      const detailMessage = toStringVal(detail.message);
      if (detailMessage) {
        message = detailMessage;
      }
    } else if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      // Verified FastAPI request validation error array
      const msgs: string[] = [];
      for (const err of detail) {
        if (isRecord(err)) {
          const loc = Array.isArray(err.loc) ? err.loc.join('.') : '';
          const msg = toStringVal(err.msg) ?? JSON.stringify(err);
          msgs.push(msg);
          details.push(loc ? `${loc}: ${msg}` : msg);
        } else {
          const text = String(err);
          msgs.push(text);
          details.push(text);
        }
      }
      if (msgs.length > 0) {
        message = msgs.join('; ');
      }
    } else if (typeof body.message === 'string') {
      message = body.message;
    } else if (typeof body.error === 'string') {
      message = body.error;
    }
  }

  if (status === 404) {
    return {
      kind: 'NOT_FOUND',
      status,
      code,
      message,
      details: details.length ? details : undefined,
      raw: body,
    };
  }
  if (status === 413) {
    return {
      kind: 'PAYLOAD_TOO_LARGE',
      status,
      code,
      message,
      details: details.length ? details : undefined,
      raw: body,
    };
  }
  if (status === 422) {
    return {
      kind: 'VALIDATION_ERROR',
      status,
      code,
      message,
      details: details.length ? details : undefined,
      raw: body,
    };
  }
  if (status >= 500) {
    return {
      kind: 'SERVER_ERROR',
      status,
      code,
      message,
      details: details.length ? details : undefined,
      raw: body,
    };
  }

  return {
    kind: 'HTTP_ERROR',
    status,
    code,
    message,
    details: details.length ? details : undefined,
    raw: body,
  };
}

/**
 * Normalizes GET /health response:
 * { status: "ok"|"degraded", version, database: { ok, schema_version, expected_schema_version } | { ok: false, error }, llm: { enabled, configured, note } }
 */
export function normalizeHealthResponse(
  raw: unknown,
  checkedAt = new Date().toISOString()
): NormalizedHealth {
  if (!isRecord(raw)) {
    return {
      online: true,
      statusLabel: typeof raw === 'string' ? raw : 'ok',
      extraFields: [],
      checkedAt,
      raw,
    };
  }

  const statusLabel = toStringVal(raw.status) ?? 'ok';
  const version = toStringVal(raw.version);

  let databaseConnected: boolean | undefined;
  let databaseError: string | undefined;
  let schemaVersion: number | string | undefined;
  let expectedSchemaVersion: number | string | undefined;

  if (isRecord(raw.database)) {
    if (typeof raw.database.ok === 'boolean') {
      databaseConnected = raw.database.ok;
    }
    schemaVersion =
      toNumber(raw.database.schema_version) ?? toStringVal(raw.database.schema_version);
    expectedSchemaVersion =
      toNumber(raw.database.expected_schema_version) ??
      toStringVal(raw.database.expected_schema_version);
    databaseError = toStringVal(raw.database.error);
  }

  let llmEnabled: boolean | undefined;
  let llmConfigured: boolean | undefined;
  let llmNote: string | undefined;

  if (isRecord(raw.llm)) {
    if (typeof raw.llm.enabled === 'boolean') llmEnabled = raw.llm.enabled;
    if (typeof raw.llm.configured === 'boolean') llmConfigured = raw.llm.configured;
    llmNote = toStringVal(raw.llm.note);
  }

  const knownKeys = new Set(['status', 'version', 'database', 'llm']);
  const extraFields: Array<{ key: string; value: string }> = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!knownKeys.has(key) && value !== undefined && value !== null) {
      extraFields.push({
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      });
    }
  }

  return {
    online: statusLabel.toLowerCase() !== 'error' && statusLabel.toLowerCase() !== 'down',
    statusLabel,
    version,
    databaseConnected,
    databaseError,
    schemaVersion,
    expectedSchemaVersion,
    llmEnabled,
    llmConfigured,
    llmNote,
    extraFields,
    checkedAt,
    raw,
  };
}

function normalizeMilestone(item: unknown): NormalizedMilestone | null {
  if (!isRecord(item)) return null;
  const id = toStringVal(item.milestone_id) ?? toStringVal(item.id) ?? 'unknown';
  const name = toStringVal(item.name) ?? id;
  const status = toStringVal(item.status) ?? 'not_started';
  const completionPct = toNumber(item.progress_percent) ?? 0;
  const notes = toStringArray(item.notes);
  const scopesCompleted = toStringArray(item.scopes_completed);

  return {
    id,
    name,
    status,
    completionPct,
    startedAt: toStringVal(item.started_at) ?? null,
    completedAt: toStringVal(item.completed_at) ?? null,
    scopesCompleted,
    notes,
    lastEventId: toStringVal(item.last_event_id) ?? null,
    raw: item,
  };
}

function normalizeMilestoneChange(item: unknown): NormalizedMilestoneChange | null {
  if (!isRecord(item)) return null;
  const milestoneId = toStringVal(item.milestone_id);
  const milestoneName = toStringVal(item.name) ?? milestoneId ?? 'Milestone';

  return {
    milestoneId,
    milestoneName,
    previousStatus: toStringVal(item.old_status),
    newStatus: toStringVal(item.new_status),
    previousPct: toNumber(item.old_progress),
    newPct: toNumber(item.new_progress),
    raw: item,
  };
}

function normalizeHistoryEntry(
  item: unknown,
  milestoneNameMap: Map<string, string>
): NormalizedMilestoneHistoryEntry | null {
  if (!isRecord(item)) return null;
  const milestoneId = toStringVal(item.milestone_id) ?? 'unknown';
  const milestoneName =
    toStringVal(item.name) ?? milestoneNameMap.get(milestoneId) ?? milestoneId;

  return {
    id: toNumber(item.id) ?? toStringVal(item.id) ?? `${milestoneId}-${item.changed_at ?? ''}`,
    milestoneId,
    milestoneName,
    eventId: toStringVal(item.event_id) ?? null,
    previousStatus: toStringVal(item.old_status),
    newStatus: toStringVal(item.new_status),
    previousPct: toNumber(item.old_progress),
    newPct: toNumber(item.new_progress),
    note: toStringVal(item.note) ?? null,
    changedAt: toStringVal(item.changed_at),
    raw: item,
  };
}

/**
 * Normalizes GET /api/v1/projects/{project_id}/state
 */
export function normalizeProjectState(raw: unknown): NormalizedProjectState {
  if (!isRecord(raw)) {
    return {
      projectId: '',
      overallProgressPct: 0,
      totalMilestones: 0,
      completedMilestones: 0,
      inProgressMilestones: 0,
      delayedMilestones: 0,
      notStartedMilestones: 0,
      milestones: [],
      unmappedActivities: [],
      history: null,
      raw,
    };
  }

  const milestones = Array.isArray(raw.milestones)
    ? raw.milestones
        .map(normalizeMilestone)
        .filter((m): m is NormalizedMilestone => m !== null)
    : [];

  const milestoneNameMap = new Map<string, string>(
    milestones.map((m) => [m.id, m.name])
  );

  const summary = isRecord(raw.summary) ? raw.summary : {};

  const history = Array.isArray(raw.history)
    ? raw.history
        .map((row) => normalizeHistoryEntry(row, milestoneNameMap))
        .filter((h): h is NormalizedMilestoneHistoryEntry => h !== null)
    : null;

  return {
    projectId: toStringVal(raw.project_id) ?? '',
    overallProgressPct: toNumber(raw.overall_progress_percent) ?? 0,
    totalMilestones: toNumber(summary.total) ?? milestones.length,
    completedMilestones: toNumber(summary.completed) ?? 0,
    inProgressMilestones: toNumber(summary.in_progress) ?? 0,
    delayedMilestones: toNumber(summary.delayed) ?? 0,
    notStartedMilestones: toNumber(summary.not_started) ?? 0,
    milestones,
    unmappedActivities: toStringArray(raw.unmapped_activities),
    generalDelayEvents: toNumber(raw.general_delay_events),
    eventsPendingReview: toNumber(raw.events_pending_review),
    messagesNotUnderstood: toNumber(raw.messages_not_understood),
    eventsTotal: toNumber(raw.events_total),
    progressNote: toStringVal(raw.progress_note) ?? null,
    history,
    raw,
  };
}

function normalizeReportEventList(val: unknown): ReportEntryItem[] | undefined {
  if (!Array.isArray(val)) return undefined;

  return val.map((entry) => {
    if (typeof entry === 'string') {
      return { text: entry, raw: entry };
    }
    if (!isRecord(entry)) {
      return { text: String(entry), raw: entry };
    }

    const sender = toStringVal(entry.sender) ?? null;
    const timestamp = toStringVal(entry.time) ?? null;
    const metaParts = [sender, timestamp].filter(Boolean) as string[];

    return {
      id: toStringVal(entry.event_id),
      text: toStringVal(entry.description) ?? toStringVal(entry.evidence) ?? JSON.stringify(entry),
      evidence: toStringVal(entry.evidence) ?? null,
      sender,
      timestamp,
      meta: metaParts.length ? metaParts.join(' · ') : undefined,
      confidence: toNumber(entry.confidence) ?? null,
      milestone: toStringVal(entry.milestone) ?? null,
      milestoneEffect: toStringVal(entry.milestone_effect) ?? null,
      extractionMethod: toStringVal(entry.extraction_method) ?? null,
      raw: entry,
    };
  });
}

function normalizeWorkInProgressList(val: unknown): ReportEntryItem[] | undefined {
  if (!Array.isArray(val)) return undefined;

  return val.map((entry) => {
    if (!isRecord(entry)) return { text: String(entry), raw: entry };
    const name = toStringVal(entry.name) ?? toStringVal(entry.milestone_id) ?? 'Milestone';
    const progressPct = toNumber(entry.progress_percent);
    const progressBasis = toStringVal(entry.progress_basis);
    const notes = toStringArray(entry.notes);

    return {
      id: toStringVal(entry.milestone_id),
      text: name,
      progressPct,
      progressBasis,
      status: progressBasis === 'not_reported' ? 'Started (progress not reported)' : progressBasis,
      notes,
      raw: entry,
    };
  });
}

function normalizeReviewList(val: unknown): ReportEntryItem[] | undefined {
  if (!Array.isArray(val)) return undefined;

  return val.map((entry) => {
    if (!isRecord(entry)) return { text: String(entry), raw: entry };
    const sender = toStringVal(entry.sender) ?? null;
    const timestamp = toStringVal(entry.time) ?? null;
    const metaParts = [sender, timestamp].filter(Boolean) as string[];
    const kind = toStringVal(entry.kind);

    return {
      text: toStringVal(entry.text) ?? JSON.stringify(entry),
      sender,
      timestamp,
      meta: metaParts.length ? metaParts.join(' · ') : undefined,
      reason: toStringVal(entry.reason) ?? null,
      kind,
      status: kind,
      flags: toStringArray(entry.flags),
      raw: entry,
    };
  });
}

function normalizeLabourSection(val: unknown): NormalizedLabourSection | undefined {
  if (!isRecord(val)) return undefined;
  return {
    reports: toNumber(val.reports) ?? 0,
    maxWorkers: toNumber(val.max_workers) ?? null,
    latestWorkers: toNumber(val.latest_workers) ?? null,
    items: normalizeReportEventList(val.items) ?? [],
  };
}

/**
 * Normalizes GET /api/v1/reports/daily (both JSON object and text/markdown string)
 */
export function normalizeDailyReport(raw: unknown): NormalizedDailyReport {
  if (typeof raw === 'string') {
    return {
      markdown: raw,
      raw,
    };
  }
  if (!isRecord(raw)) {
    return { raw };
  }

  const counts = isRecord(raw.counts)
    ? {
        acceptedEvents: toNumber(raw.counts.accepted_events) ?? 0,
        needsReview: toNumber(raw.counts.needs_review) ?? 0,
        messages: toNumber(raw.counts.messages) ?? 0,
      }
    : undefined;

  return {
    projectId: toStringVal(raw.project_id),
    reportDate: toStringVal(raw.report_date),
    generatedAt: toStringVal(raw.generated_at),
    overallProgressPct: toNumber(raw.overall_progress_percent),
    counts,
    duplicatesIgnored: toNumber(raw.duplicates_ignored),
    extractionMethod: toStringVal(raw.extraction_method),
    workCompleted: normalizeReportEventList(raw.work_completed),
    workStarted: normalizeReportEventList(raw.work_started),
    workInProgress: normalizeWorkInProgressList(raw.work_in_progress),
    plannedWork: normalizeReportEventList(raw.work_planned),
    materialsReceived: normalizeReportEventList(raw.material_received),
    materialsExpected: normalizeReportEventList(raw.material_expected),
    materialDelaysOrShortages: normalizeReportEventList(raw.material_delays),
    materialsRequested: normalizeReportEventList(raw.material_requested),
    labour: normalizeLabourSection(raw.labour),
    importantSiteIssues: normalizeReportEventList(raw.site_issues),
    needsSupervisorReview: normalizeReviewList(raw.needs_review),
    markdown: toStringVal(raw.markdown),
    raw,
  };
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  accepted: 'Accepted',
  needs_review: 'Needs review',
  not_understood: 'Not understood',
  duplicate_ignored: 'Duplicate ignored',
  possible_duplicate: 'Possible duplicate',
};

function collectEventsFromLatestReport(
  report: NormalizedDailyReport | undefined
): NormalizedExtractedEvent[] {
  if (!report) return [];
  const collected: NormalizedExtractedEvent[] = [];

  const acceptedBuckets: Array<{ label: string; items?: ReportEntryItem[] }> = [
    { label: 'Work Completed', items: report.workCompleted },
    { label: 'Work Started', items: report.workStarted },
    { label: 'Planned Work', items: report.plannedWork },
    { label: 'Material Received', items: report.materialsReceived },
    { label: 'Material Expected', items: report.materialsExpected },
    { label: 'Material Delay', items: report.materialDelaysOrShortages },
    { label: 'Material Requested', items: report.materialsRequested },
    { label: 'Labour Update', items: report.labour?.items },
    { label: 'Site Issue', items: report.importantSiteIssues },
  ];

  for (const bucket of acceptedBuckets) {
    if (!bucket.items) continue;
    for (const item of bucket.items) {
      collected.push({
        id: item.id,
        category: 'accepted',
        categoryLabel: CATEGORY_LABELS.accepted,
        eventType: bucket.label,
        summary: item.text,
        rawMessage: item.evidence ?? undefined,
        sender: item.sender ?? undefined,
        timestamp: item.timestamp ?? undefined,
        confidence: item.confidence ?? undefined,
        milestoneName: item.milestone ?? undefined,
        milestoneEffect: item.milestoneEffect ?? undefined,
        extractionMethod: item.extractionMethod ?? undefined,
        raw: isRecord(item.raw) ? item.raw : { item: item.raw },
      });
    }
  }

  if (report.needsSupervisorReview) {
    for (const reviewItem of report.needsSupervisorReview) {
      const flags = reviewItem.flags ?? [];
      let category: EventCategory = 'needs_review';
      if (flags.includes('possible_duplicate')) {
        category = 'possible_duplicate';
      } else if (reviewItem.kind === 'not_understood' || flags.includes('not_understood')) {
        category = 'not_understood';
      }

      collected.push({
        category,
        categoryLabel: CATEGORY_LABELS[category],
        eventType: reviewItem.kind || 'Review item',
        summary: reviewItem.text,
        rawMessage: reviewItem.text,
        sender: reviewItem.sender ?? undefined,
        timestamp: reviewItem.timestamp ?? undefined,
        reason: reviewItem.reason ?? undefined,
        flags,
        raw: isRecord(reviewItem.raw) ? reviewItem.raw : { item: reviewItem.raw },
      });
    }
  }

  return collected;
}

/**
 * Normalizes POST /api/v1/whatsapp/import and POST /api/v1/whatsapp/import-file
 */
export function normalizeImportResponse(raw: unknown): NormalizedImportResult {
  if (!isRecord(raw)) {
    return {
      warnings: [],
      affectedDates: [],
      events: [],
      milestoneChanges: [],
      raw,
    };
  }

  const messagesObj = isRecord(raw.messages) ? raw.messages : {};
  const eventsObj = isRecord(raw.events) ? raw.events : {};
  const llmObj = isRecord(raw.llm) ? raw.llm : {};

  const latestReport =
    isRecord(raw.latest_report) || typeof raw.latest_report === 'string'
      ? normalizeDailyReport(raw.latest_report)
      : undefined;

  const projectState = isRecord(raw.project_state)
    ? normalizeProjectState(raw.project_state)
    : undefined;

  const milestoneChanges = Array.isArray(raw.milestone_changes)
    ? raw.milestone_changes
        .map(normalizeMilestoneChange)
        .filter((m): m is NormalizedMilestoneChange => m !== null)
    : [];

  return {
    projectId: toStringVal(raw.project_id),
    batchId: toNumber(raw.batch_id),
    source: toStringVal(raw.source),
    filename: toStringVal(raw.filename) ?? null,
    dateOrder: toStringVal(raw.date_order),
    dateOrderAmbiguous:
      typeof raw.date_order_ambiguous === 'boolean' ? raw.date_order_ambiguous : undefined,
    messagesParsed: toNumber(messagesObj.parsed),
    systemMessages: toNumber(messagesObj.system),
    mediaDeletedMessages: toNumber(messagesObj.media_or_deleted),
    alreadyImportedMessages: toNumber(messagesObj.already_imported),
    processedMessages: toNumber(messagesObj.processed),
    noTimestampMessages: toNumber(messagesObj.no_timestamp),
    eventsCreated: toNumber(eventsObj.created),
    acceptedEventsCount: toNumber(eventsObj.accepted),
    needsReviewCount: toNumber(eventsObj.needs_review),
    notUnderstoodCount: toNumber(eventsObj.not_understood),
    duplicatesIgnoredCount: toNumber(eventsObj.duplicates_ignored),
    possibleDuplicatesCount: toNumber(eventsObj.possible_duplicates),
    llmExtractionMode: toStringVal(llmObj.mode),
    llmEnabled: typeof llmObj.enabled === 'boolean' ? llmObj.enabled : undefined,
    llmUsed: typeof llmObj.used === 'boolean' ? llmObj.used : undefined,
    llmCalls: toNumber(llmObj.calls),
    llmFailures: toNumber(llmObj.failures),
    warnings: toStringArray(raw.warnings),
    affectedDates: toStringArray(raw.dates_affected),
    events: collectEventsFromLatestReport(latestReport),
    milestoneChanges,
    projectState,
    latestReport,
    raw,
  };
}

/**
 * Normalizes POST /api/v1/projects/{project_id}/milestones/recompute
 */
export function normalizeRecomputeResponse(raw: unknown): NormalizedRecomputeResult {
  if (!isRecord(raw)) {
    return { milestoneChanges: [], raw };
  }

  const milestoneChanges = Array.isArray(raw.milestone_changes)
    ? raw.milestone_changes
        .map(normalizeMilestoneChange)
        .filter((m): m is NormalizedMilestoneChange => m !== null)
    : [];

  const projectState = isRecord(raw.project_state)
    ? normalizeProjectState(raw.project_state)
    : undefined;

  return {
    projectState,
    milestoneChanges,
    raw,
  };
}
