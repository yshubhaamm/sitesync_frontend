import type {
  ApiErrorInfo,
  EventCategory,
  NormalizedDailyReport,
  NormalizedExtractedEvent,
  NormalizedHealth,
  NormalizedImportResult,
  NormalizedMilestone,
  NormalizedMilestoneChange,
  NormalizedMilestoneHistoryEntry,
  NormalizedProjectState,
  NormalizedRecomputeResult,
  ReportEntryItem,
} from '../types/api';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickDefined<T = unknown>(
  obj: Record<string, unknown>,
  keys: string[]
): T | undefined {
  for (const key of keys) {
    if (key in obj && obj[key] !== undefined && obj[key] !== null) {
      return obj[key] as T;
    }
  }
  return undefined;
}

function toNumber(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toBoolean(val: unknown): boolean | undefined {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.trim().toLowerCase();
    if (['true', '1', 'yes', 'connected', 'online', 'ok', 'healthy', 'enabled'].includes(lower)) {
      return true;
    }
    if (['false', '0', 'no', 'disconnected', 'offline', 'disabled', 'error'].includes(lower)) {
      return false;
    }
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
    .map((item) => {
      if (typeof item === 'string') return item;
      if (isRecord(item)) {
        return (
          toStringVal(pickDefined(item, ['message', 'detail', 'text', 'warning', 'date'])) ??
          JSON.stringify(item)
        );
      }
      return String(item);
    })
    .filter((s) => s.trim().length > 0);
}

function countOrLength(obj: Record<string, unknown>, countKeys: string[], listKeys: string[]): number | undefined {
  const numVal = toNumber(pickDefined(obj, countKeys));
  if (numVal !== undefined) return numVal;
  for (const key of listKeys) {
    const candidate = obj[key];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (Array.isArray(candidate)) return candidate.length;
  }
  return undefined;
}

export function formatApiError(status: number | undefined, body: unknown, fallbackMessage?: string): ApiErrorInfo {
  if (status === undefined) {
    return {
      kind: 'NETWORK_OR_CORS',
      message:
        fallbackMessage ||
        'Unable to reach the FastAPI backend. Ensure the server is running and CORS is enabled for this origin.',
      raw: body,
    };
  }

  let message = fallbackMessage || `Request failed with HTTP ${status}`;
  const details: string[] = [];

  if (typeof body === 'string' && body.trim().length > 0) {
    message = body.trim();
  } else if (isRecord(body)) {
    const detail = body.detail;
    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = status === 422 ? 'Validation error in request parameters.' : message;
      for (const err of detail) {
        if (isRecord(err)) {
          const loc = Array.isArray(err.loc) ? err.loc.join('.') : '';
          const msg = toStringVal(err.msg) ?? JSON.stringify(err);
          details.push(loc ? `${loc}: ${msg}` : msg);
        } else {
          details.push(String(err));
        }
      }
    } else if (typeof body.message === 'string') {
      message = body.message;
    } else if (typeof body.error === 'string') {
      message = body.error;
    }
  }

  if (status === 404) {
    return { kind: 'NOT_FOUND', status, message, details: details.length ? details : undefined, raw: body };
  }
  if (status === 422) {
    return { kind: 'VALIDATION_ERROR', status, message, details: details.length ? details : undefined, raw: body };
  }
  if (status >= 500) {
    return { kind: 'SERVER_ERROR', status, message, details: details.length ? details : undefined, raw: body };
  }
  return { kind: 'HTTP_ERROR', status, message, details: details.length ? details : undefined, raw: body };
}

export function normalizeHealthResponse(raw: unknown, checkedAt = new Date().toISOString()): NormalizedHealth {
  if (!isRecord(raw)) {
    return {
      online: true,
      statusLabel: typeof raw === 'string' ? raw : 'ok',
      extraFields: [],
      checkedAt,
      raw,
    };
  }

  const rawStatus = toStringVal(pickDefined(raw, ['status', 'state', 'health']));
  const dbRaw = pickDefined(raw, ['database', 'db', 'db_status', 'database_status']);
  const dbConnectedRaw = pickDefined(raw, ['database_connected', 'db_connected', 'db_ok']);

  let databaseConnected: boolean | undefined = toBoolean(dbConnectedRaw);
  let databaseLabel: string | undefined;
  let schemaFromDbObj: string | number | undefined;

  if (typeof dbRaw === 'string') {
    databaseLabel = dbRaw;
    if (databaseConnected === undefined) databaseConnected = toBoolean(dbRaw);
  } else if (typeof dbRaw === 'boolean') {
    databaseConnected = dbRaw;
    databaseLabel = dbRaw ? 'connected' : 'disconnected';
  } else if (isRecord(dbRaw)) {
    const nestedConnected = pickDefined(dbRaw, ['connected', 'ok', 'status']);
    databaseConnected = toBoolean(nestedConnected);
    databaseLabel = toStringVal(nestedConnected) ?? (databaseConnected ? 'connected' : 'disconnected');
    schemaFromDbObj = pickDefined<string | number>(dbRaw, ['schema_version', 'version']);
  }

  const schemaVersion =
    pickDefined<string | number>(raw, [
      'database_schema_version',
      'db_schema_version',
      'schema_version',
      'db_version',
    ]) ?? schemaFromDbObj;

  const llmRaw = pickDefined(raw, ['llm_enabled', 'llm', 'ai_enabled', 'gemini_enabled']);
  let llmEnabled: boolean | undefined;
  let llmModel: string | undefined;

  if (typeof llmRaw === 'boolean') {
    llmEnabled = llmRaw;
  } else if (typeof llmRaw === 'string') {
    llmEnabled = toBoolean(llmRaw);
    if (llmEnabled === undefined) llmModel = llmRaw;
  } else if (isRecord(llmRaw)) {
    llmEnabled = toBoolean(pickDefined(llmRaw, ['enabled', 'active', 'available']));
    llmModel = toStringVal(pickDefined(llmRaw, ['model', 'provider', 'mode']));
  }

  if (!llmModel) {
    llmModel = toStringVal(pickDefined(raw, ['llm_model', 'llm_provider', 'extraction_mode']));
  }

  const knownKeys = new Set([
    'status',
    'state',
    'health',
    'database',
    'db',
    'db_status',
    'database_status',
    'database_connected',
    'db_connected',
    'db_ok',
    'database_schema_version',
    'db_schema_version',
    'schema_version',
    'db_version',
    'llm_enabled',
    'llm',
    'ai_enabled',
    'gemini_enabled',
    'llm_model',
    'llm_provider',
    'extraction_mode',
  ]);

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
    online: rawStatus ? rawStatus.toLowerCase() !== 'error' && rawStatus.toLowerCase() !== 'down' : true,
    statusLabel: rawStatus ?? 'ok',
    databaseConnected,
    databaseLabel,
    schemaVersion,
    llmEnabled,
    llmModel,
    extraFields,
    checkedAt,
    raw,
  };
}

function normalizeMilestone(item: unknown): NormalizedMilestone | null {
  if (!isRecord(item)) return null;
  const name =
    toStringVal(pickDefined(item, ['milestone_name', 'name', 'title', 'milestone', 'key'])) ??
    'Unnamed Milestone';
  const status =
    toStringVal(pickDefined(item, ['status', 'state'])) ?? 'unknown';
  const completionPct = toNumber(
    pickDefined(item, ['completion_pct', 'completion_percentage', 'progress_pct', 'progress', 'percentage'])
  );
  const notes = toStringVal(pickDefined(item, ['notes', 'note', 'summary', 'description', 'last_note']));
  const updatedAt = toStringVal(pickDefined(item, ['updated_at', 'last_updated', 'timestamp']));
  const id = pickDefined<string | number>(item, ['id', 'milestone_id']);

  return {
    id,
    name,
    status,
    completionPct,
    notes,
    updatedAt,
    raw: item,
  };
}

function normalizeMilestoneChange(item: unknown): NormalizedMilestoneChange | null {
  if (!isRecord(item)) return null;
  const milestoneName =
    toStringVal(pickDefined(item, ['milestone_name', 'name', 'milestone', 'title'])) ??
    'Milestone';
  return {
    milestoneId: pickDefined<string | number>(item, ['milestone_id', 'id']),
    milestoneName,
    previousStatus: toStringVal(pickDefined(item, ['previous_status', 'old_status', 'from_status'])),
    newStatus: toStringVal(pickDefined(item, ['new_status', 'status', 'to_status'])),
    previousPct: toNumber(
      pickDefined(item, ['previous_pct', 'previous_completion_pct', 'old_progress', 'from_pct', 'old_pct'])
    ),
    newPct: toNumber(
      pickDefined(item, ['new_pct', 'new_completion_pct', 'completion_pct', 'progress_pct', 'to_pct', 'new_progress'])
    ),
    notes: toStringVal(pickDefined(item, ['notes', 'note', 'description'])),
    reason: toStringVal(pickDefined(item, ['reason', 'trigger', 'source_message'])),
    changedAt: toStringVal(pickDefined(item, ['changed_at', 'updated_at', 'created_at', 'timestamp', 'date'])),
    raw: item,
  };
}

function normalizeHistoryEntry(item: unknown): NormalizedMilestoneHistoryEntry | null {
  const base = normalizeMilestoneChange(item);
  if (!base || !isRecord(item)) return null;
  return {
    id: pickDefined<string | number>(item, ['id', 'history_id']),
    milestoneName: base.milestoneName,
    previousStatus: base.previousStatus,
    newStatus: base.newStatus,
    previousPct: base.previousPct,
    newPct: base.newPct,
    notes: base.notes,
    reason: base.reason,
    changedAt: base.changedAt,
    sourceMessage: toStringVal(pickDefined(item, ['source_message', 'raw_message', 'message_text', 'message'])),
    raw: item,
  };
}

export function normalizeProjectState(raw: unknown): NormalizedProjectState {
  if (!isRecord(raw)) {
    return { milestones: [], raw };
  }

  const summary = isRecord(raw.summary) ? raw.summary : raw;
  const milestonesRaw = pickDefined<unknown[]>(raw, ['milestones', 'items', 'milestone_states']) ?? [];
  const milestones = Array.isArray(milestonesRaw)
    ? milestonesRaw.map(normalizeMilestone).filter((m): m is NormalizedMilestone => m !== null)
    : [];

  const historyRaw = pickDefined<unknown[]>(raw, ['history', 'milestone_history', 'changes']);
  const history = Array.isArray(historyRaw)
    ? historyRaw
        .map(normalizeHistoryEntry)
        .filter((h): h is NormalizedMilestoneHistoryEntry => h !== null)
    : undefined;

  return {
    projectId: toStringVal(pickDefined(raw, ['project_id', 'id'])),
    overallProgressPct: toNumber(
      pickDefined(summary, [
        'overall_progress_pct',
        'overall_progress_percentage',
        'overall_progress',
        'progress_pct',
        'progress',
      ]) ?? pickDefined(raw, ['overall_progress_pct', 'overall_progress', 'progress'])
    ),
    totalMilestones: toNumber(
      pickDefined(summary, ['total_milestones', 'milestone_count']) ??
        pickDefined(raw, ['total_milestones'])
    ),
    completedMilestones: toNumber(
      pickDefined(summary, ['completed_milestones', 'completed_count', 'completed']) ??
        pickDefined(raw, ['completed_milestones'])
    ),
    inProgressMilestones: toNumber(
      pickDefined(summary, ['in_progress_milestones', 'in_progress_count', 'in_progress']) ??
        pickDefined(raw, ['in_progress_milestones'])
    ),
    delayedMilestones: toNumber(
      pickDefined(summary, ['delayed_milestones', 'delayed_count', 'delayed']) ??
        pickDefined(raw, ['delayed_milestones'])
    ),
    notStartedMilestones: toNumber(
      pickDefined(summary, ['not_started_milestones', 'not_started_count', 'not_started']) ??
        pickDefined(raw, ['not_started_milestones'])
    ),
    milestones,
    history,
    lastUpdated: toStringVal(pickDefined(raw, ['updated_at', 'last_updated', 'generated_at'])),
    raw,
  };
}

function normalizeReportItems(val: unknown): ReportEntryItem[] | undefined {
  if (val === undefined || val === null) return undefined;
  if (!Array.isArray(val)) {
    if (typeof val === 'string' && val.trim().length > 0) {
      return [{ text: val, raw: val }];
    }
    return undefined;
  }

  return val.map((entry) => {
    if (typeof entry === 'string') {
      return { text: entry, raw: entry };
    }
    if (isRecord(entry)) {
      const text =
        toStringVal(
          pickDefined(entry, [
            'summary',
            'description',
            'text',
            'message',
            'raw_message',
            'title',
            'task',
            'item',
            'material',
            'issue',
            'name',
          ])
        ) ?? JSON.stringify(entry);
      const progressPct = toNumber(
        pickDefined(entry, ['completion_pct', 'progress_pct', 'progress', 'percentage'])
      );
      const sender = toStringVal(pickDefined(entry, ['sender', 'author', 'reported_by']));
      const timestamp = toStringVal(pickDefined(entry, ['timestamp', 'time', 'date', 'reported_at']));
      const status = toStringVal(pickDefined(entry, ['status', 'category', 'event_type']));
      const reason = toStringVal(pickDefined(entry, ['reason', 'review_reason', 'notes', 'note']));
      const quantity = toStringVal(pickDefined(entry, ['quantity', 'qty', 'count', 'unit']));
      const metaParts = [quantity, sender, timestamp].filter(Boolean);
      return {
        text,
        meta: metaParts.length ? metaParts.join(' · ') : undefined,
        status,
        sender,
        timestamp,
        progressPct,
        reason,
        raw: entry,
      };
    }
    return { text: String(entry), raw: entry };
  });
}

export function normalizeDailyReport(raw: unknown): NormalizedDailyReport {
  if (typeof raw === 'string') {
    return {
      markdown: raw,
      extraSections: [],
      raw,
    };
  }
  if (!isRecord(raw)) {
    return { extraSections: [], raw };
  }

  const markdown = toStringVal(
    pickDefined(raw, ['markdown', 'report_markdown', 'content_markdown', 'md'])
  );

  // Support both flat report payloads and nested `report` / `sections` wrappers
  const root = isRecord(raw.report) ? raw.report : raw;
  const sections = isRecord(root.sections) ? root.sections : root;

  const projectId = toStringVal(pickDefined(raw, ['project_id']) ?? pickDefined(root, ['project_id']));
  const reportDate = toStringVal(
    pickDefined(root, ['report_date', 'date']) ?? pickDefined(raw, ['report_date', 'date'])
  );
  const overallProgressPct = toNumber(
    pickDefined(root, [
      'overall_progress_pct',
      'overall_project_progress',
      'overall_progress',
      'progress_pct',
      'progress',
    ])
  );
  const summary = toStringVal(pickDefined(root, ['summary', 'overview', 'executive_summary']));

  const workCompleted = normalizeReportItems(
    pickDefined(sections, ['work_completed', 'completed_work'])
  );
  const workStarted = normalizeReportItems(
    pickDefined(sections, ['work_started', 'started_work'])
  );
  const workInProgress = normalizeReportItems(
    pickDefined(sections, ['work_in_progress', 'in_progress_work', 'ongoing_work'])
  );
  const plannedWork = normalizeReportItems(
    pickDefined(sections, ['planned_work', 'upcoming_work', 'planned_upcoming_work', 'future_work'])
  );
  const materialsReceived = normalizeReportItems(
    pickDefined(sections, ['materials_received', 'material_received'])
  );
  const materialsExpected = normalizeReportItems(
    pickDefined(sections, ['materials_expected', 'material_expected'])
  );
  const materialDelaysOrShortages = normalizeReportItems(
    pickDefined(sections, [
      'material_delays_or_shortages',
      'material_delays',
      'material_shortages',
      'materials_delayed',
      'material_not_received',
    ])
  );
  const materialsRequested = normalizeReportItems(
    pickDefined(sections, ['materials_requested', 'material_requested'])
  );
  const labourUpdates = normalizeReportItems(
    pickDefined(sections, ['labour_updates', 'labor_updates', 'labour', 'manpower_updates'])
  );
  const importantSiteIssues = normalizeReportItems(
    pickDefined(sections, ['important_site_issues', 'site_issues', 'issues', 'blockers'])
  );
  const needsSupervisorReview = normalizeReportItems(
    pickDefined(sections, [
      'messages_requiring_supervisor_review',
      'messages_requiring_review',
      'supervisor_review_messages',
      'needs_supervisor_review',
      'needs_review',
      'review_messages',
    ])
  );

  const handledKeys = new Set([
    'project_id',
    'report_date',
    'date',
    'overall_progress_pct',
    'overall_project_progress',
    'overall_progress',
    'progress_pct',
    'progress',
    'summary',
    'overview',
    'executive_summary',
    'markdown',
    'report_markdown',
    'content_markdown',
    'md',
    'report',
    'sections',
    'work_completed',
    'completed_work',
    'work_started',
    'started_work',
    'work_in_progress',
    'in_progress_work',
    'ongoing_work',
    'planned_work',
    'upcoming_work',
    'planned_upcoming_work',
    'future_work',
    'materials_received',
    'material_received',
    'materials_expected',
    'material_expected',
    'material_delays_or_shortages',
    'material_delays',
    'material_shortages',
    'materials_delayed',
    'material_not_received',
    'materials_requested',
    'material_requested',
    'labour_updates',
    'labor_updates',
    'labour',
    'manpower_updates',
    'important_site_issues',
    'site_issues',
    'issues',
    'blockers',
    'messages_requiring_supervisor_review',
    'messages_requiring_review',
    'supervisor_review_messages',
    'needs_supervisor_review',
    'needs_review',
    'review_messages',
  ]);

  const extraSections: Array<{ key: string; label: string; value: unknown }> = [];
  for (const [key, value] of Object.entries(sections)) {
    if (!handledKeys.has(key) && value !== undefined && value !== null) {
      extraSections.push({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value,
      });
    }
  }

  return {
    projectId,
    reportDate,
    overallProgressPct,
    summary,
    workCompleted,
    workStarted,
    workInProgress,
    plannedWork,
    materialsReceived,
    materialsExpected,
    materialDelaysOrShortages,
    materialsRequested,
    labourUpdates,
    importantSiteIssues,
    needsSupervisorReview,
    markdown,
    extraSections,
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

function inferCategory(rawCategory: string | undefined, fallback: EventCategory): EventCategory {
  if (!rawCategory) return fallback;
  const c = rawCategory.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (c === 'accepted' || c === 'auto_accepted' || c === 'confirmed') return 'accepted';
  if (c === 'needs_review' || c === 'review' || c === 'supervisor_review') return 'needs_review';
  if (c === 'not_understood' || c === 'unclassified' || c === 'unknown') return 'not_understood';
  if (c === 'duplicate_ignored' || c === 'duplicate' || c === 'already_imported') return 'duplicate_ignored';
  if (c === 'possible_duplicate' || c === 'potential_duplicate') return 'possible_duplicate';
  return fallback;
}

function normalizeEventObject(item: unknown, defaultCategory: EventCategory): NormalizedExtractedEvent | null {
  if (typeof item === 'string') {
    return {
      category: defaultCategory,
      categoryLabel: CATEGORY_LABELS[defaultCategory],
      rawMessage: item,
      summary: item,
      raw: { text: item },
    };
  }
  if (!isRecord(item)) return null;

  const statusOrDecision = toStringVal(
    pickDefined(item, ['review_status', 'classification', 'decision', 'category', 'bucket', 'status'])
  );
  const category = inferCategory(statusOrDecision, defaultCategory);

  return {
    id: pickDefined<string | number>(item, ['id', 'event_id', 'message_id']),
    category,
    categoryLabel: CATEGORY_LABELS[category],
    eventType: toStringVal(pickDefined(item, ['event_type', 'type', 'intent'])),
    status: toStringVal(pickDefined(item, ['milestone_status', 'work_status', 'status'])),
    summary: toStringVal(
      pickDefined(item, ['summary', 'normalized_text', 'description', 'extracted_text', 'message'])
    ),
    rawMessage: toStringVal(pickDefined(item, ['raw_message', 'original_text', 'raw_text', 'text', 'message'])),
    sender: toStringVal(pickDefined(item, ['sender', 'author', 'from'])),
    timestamp: toStringVal(pickDefined(item, ['timestamp', 'message_timestamp', 'sent_at'])),
    date: toStringVal(pickDefined(item, ['date', 'event_date'])),
    confidence: toNumber(pickDefined(item, ['confidence', 'confidence_score', 'score'])),
    reason: toStringVal(pickDefined(item, ['reason', 'review_reason', 'warning', 'explanation'])),
    milestoneName: toStringVal(pickDefined(item, ['milestone_name', 'milestone', 'activity'])),
    progressPct: toNumber(pickDefined(item, ['completion_pct', 'progress_pct', 'progress', 'percentage'])),
    raw: item,
  };
}

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

  const stats = isRecord(raw.summary)
    ? raw.summary
    : isRecord(raw.counts)
      ? raw.counts
      : isRecord(raw.stats)
        ? raw.stats
        : raw;

  const messagesParsed = countOrLength(
    stats,
    ['messages_parsed', 'total_messages_parsed', 'parsed_messages', 'total_messages'],
    []
  );
  const systemMessages = countOrLength(stats, ['system_messages', 'system_messages_count'], []);
  const mediaDeletedMessages = countOrLength(
    stats,
    ['media_deleted_messages', 'media_or_deleted_messages', 'media_messages', 'deleted_messages'],
    []
  );
  const processedMessages = countOrLength(stats, ['processed_messages', 'processed_count'], []);
  const alreadyImportedMessages = countOrLength(
    stats,
    ['already_imported_messages', 'already_imported', 'already_imported_count'],
    []
  );
  const acceptedEventsCount = countOrLength(
    stats,
    ['accepted_events_count', 'accepted_count', 'accepted_events'],
    ['accepted_events', 'accepted']
  );
  const needsReviewCount = countOrLength(
    stats,
    ['needs_review_count', 'needs_review_events_count', 'needs_review_events', 'needs_review'],
    ['needs_review_events', 'needs_review_messages', 'needs_review']
  );
  const notUnderstoodCount = countOrLength(
    stats,
    ['not_understood_count', 'not_understood_events_count', 'not_understood_events', 'not_understood'],
    ['not_understood_events', 'not_understood_messages', 'not_understood']
  );
  const duplicatesIgnoredCount = countOrLength(
    stats,
    ['duplicates_ignored', 'duplicates_ignored_count', 'duplicate_ignored_count'],
    ['duplicates_ignored_events', 'duplicate_ignored']
  );
  const possibleDuplicatesCount = countOrLength(
    stats,
    ['possible_duplicates', 'possible_duplicates_count', 'possible_duplicate_count'],
    ['possible_duplicate_events', 'possible_duplicates']
  );

  const llmExtractionMode = toStringVal(
    pickDefined(raw, ['llm_extraction_mode', 'extraction_mode', 'llm_mode']) ??
      pickDefined(stats, ['llm_extraction_mode', 'extraction_mode'])
  );

  const dateOrderAmbiguous = toBoolean(
    pickDefined(raw, ['date_order_ambiguous', 'is_date_order_ambiguous']) ??
      pickDefined(stats, ['date_order_ambiguous'])
  );

  const warnings = toStringArray(pickDefined(raw, ['warnings', 'warning_messages']));
  const affectedDates = toStringArray(pickDefined(raw, ['affected_dates', 'dates']));

  const events: NormalizedExtractedEvent[] = [];

  // 1. Collect from unified `events` / `extracted_events` / `results` list if present
  const unifiedEvents = pickDefined<unknown[]>(raw, ['events', 'extracted_events', 'items']);
  if (Array.isArray(unifiedEvents)) {
    for (const item of unifiedEvents) {
      const norm = normalizeEventObject(item, 'accepted');
      if (norm) events.push(norm);
    }
  }

  // 2. Collect from bucketed lists if backend returns separate arrays
  const bucketMap: Array<{ keys: string[]; category: EventCategory }> = [
    { keys: ['accepted_events', 'accepted_items'], category: 'accepted' },
    { keys: ['needs_review_events', 'needs_review_messages', 'needs_review_items'], category: 'needs_review' },
    { keys: ['not_understood_events', 'not_understood_messages', 'not_understood_items'], category: 'not_understood' },
    { keys: ['duplicate_ignored_events', 'duplicates_ignored_items', 'ignored_duplicates'], category: 'duplicate_ignored' },
    { keys: ['possible_duplicate_events', 'possible_duplicates_items'], category: 'possible_duplicate' },
  ];

  for (const bucket of bucketMap) {
    const arr = pickDefined<unknown[]>(raw, bucket.keys);
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const norm = normalizeEventObject(item, bucket.category);
        if (norm) events.push(norm);
      }
    }
  }

  const milestoneChangesRaw = pickDefined<unknown[]>(raw, ['milestone_changes', 'milestone_updates']);
  const milestoneChanges = Array.isArray(milestoneChangesRaw)
    ? milestoneChangesRaw
        .map(normalizeMilestoneChange)
        .filter((m): m is NormalizedMilestoneChange => m !== null)
    : [];

  const projectStateRaw = pickDefined(raw, ['project_state', 'state']);
  const projectState = isRecord(projectStateRaw) ? normalizeProjectState(projectStateRaw) : undefined;

  const latestReportRaw = pickDefined(raw, ['latest_report', 'daily_report', 'report']);
  const latestReport =
    isRecord(latestReportRaw) || typeof latestReportRaw === 'string'
      ? normalizeDailyReport(latestReportRaw)
      : undefined;

  return {
    projectId: toStringVal(pickDefined(raw, ['project_id'])),
    messagesParsed,
    systemMessages,
    mediaDeletedMessages,
    processedMessages,
    alreadyImportedMessages,
    acceptedEventsCount,
    needsReviewCount,
    notUnderstoodCount,
    duplicatesIgnoredCount,
    possibleDuplicatesCount,
    llmExtractionMode,
    dateOrderAmbiguous,
    warnings,
    affectedDates,
    events,
    milestoneChanges,
    projectState,
    latestReport,
    raw,
  };
}

export function normalizeRecomputeResponse(raw: unknown): NormalizedRecomputeResult {
  if (!isRecord(raw)) {
    return { milestoneChanges: [], raw };
  }

  const changesRaw = pickDefined<unknown[]>(raw, ['milestone_changes', 'changes', 'milestone_updates']);
  const milestoneChanges = Array.isArray(changesRaw)
    ? changesRaw
        .map(normalizeMilestoneChange)
        .filter((m): m is NormalizedMilestoneChange => m !== null)
    : [];

  const projectStateRaw = pickDefined(raw, ['project_state', 'state']);
  const projectState = isRecord(projectStateRaw) ? normalizeProjectState(projectStateRaw) : undefined;

  return {
    projectId: toStringVal(pickDefined(raw, ['project_id'])),
    message: toStringVal(pickDefined(raw, ['message', 'detail', 'status'])),
    milestonesUpdated: toNumber(pickDefined(raw, ['milestones_updated', 'updated_count'])),
    overallProgressPct: toNumber(
      pickDefined(raw, ['overall_progress_pct', 'overall_progress', 'progress_pct'])
    ),
    milestoneChanges,
    projectState,
    raw,
  };
}
