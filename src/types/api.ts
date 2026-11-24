export type NavSection = 'dashboard' | 'import' | 'progress' | 'reports';

export type ApiErrorKind =
  | 'NETWORK_OR_CORS'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'PAYLOAD_TOO_LARGE'
  | 'SERVER_ERROR'
  | 'HTTP_ERROR';

export type BackendErrorCode =
  | 'empty_input'
  | 'no_whatsapp_messages_found'
  | 'invalid_project_id'
  | 'input_too_large'
  | 'unsupported_file_type'
  | 'file_too_large'
  | 'invalid_encoding'
  | 'project_not_found'
  | 'no_events'
  | string;

export interface ApiErrorInfo {
  kind: ApiErrorKind;
  status?: number;
  code?: BackendErrorCode;
  message: string;
  details?: string[];
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Exact Verified FastAPI Contract Types (from API_CONTRACT.md)
// ---------------------------------------------------------------------------

export interface HealthDatabaseOk {
  ok: true;
  schema_version: number;
  expected_schema_version: number;
}

export interface HealthDatabaseError {
  ok: false;
  error: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  database: HealthDatabaseOk | HealthDatabaseError;
  llm: {
    enabled: boolean;
    configured: boolean;
    note?: string;
  };
}

export interface WhatsAppImportRequest {
  project_id: string;
  chat_text: string;
  reference_date?: string;
}

export interface ImportMessagesCounts {
  parsed: number;
  system: number;
  media_or_deleted: number;
  already_imported: number;
  processed: number;
  no_timestamp: number;
}

export interface ImportEventsCounts {
  created: number;
  accepted: number;
  needs_review: number;
  not_understood: number;
  duplicates_ignored: number;
  possible_duplicates: number;
}

export interface ImportLlmSummary {
  enabled: boolean;
  used: boolean;
  calls: number;
  failures: number;
  events: number;
  mode: string;
}

export interface ReportEventItem {
  event_id: string;
  description: string;
  sender: string | null;
  time: string | null;
  confidence: number | null;
  evidence: string | null;
  extraction_method: string | null;
  milestone: string | null;
  milestone_effect: string | null;
}

export interface WorkInProgressItem {
  milestone_id: string;
  name: string;
  progress_percent: number;
  progress_basis: string;
  notes: string[];
}

export interface LabourSummary {
  reports: number;
  max_workers: number | null;
  latest_workers: number | null;
  items: ReportEventItem[];
}

export interface ReviewItem {
  kind: 'low_confidence' | 'not_understood' | string;
  text: string;
  sender: string | null;
  time: string | null;
  reason: string | null;
  proposed: unknown;
  flags: string[];
}

export interface DailyReportResponse {
  project_id: string;
  report_date: string;
  generated_at: string;
  overall_progress_percent: number;
  counts: {
    accepted_events: number;
    needs_review: number;
    messages: number;
  };
  work_completed: ReportEventItem[];
  work_started: ReportEventItem[];
  work_in_progress: WorkInProgressItem[];
  work_planned: ReportEventItem[];
  material_received: ReportEventItem[];
  material_expected: ReportEventItem[];
  material_delays: ReportEventItem[];
  material_requested: ReportEventItem[];
  labour: LabourSummary;
  site_issues: ReportEventItem[];
  needs_review: ReviewItem[];
  duplicates_ignored: number;
  extraction_method: string;
  markdown: string;
}

export type MilestoneStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed' | string;

export interface MilestoneChangeResponse {
  milestone_id: string;
  name: string;
  old_status: MilestoneStatus;
  new_status: MilestoneStatus;
  old_progress: number;
  new_progress: number;
}

export interface MilestoneStateResponse {
  milestone_id: string;
  name: string;
  status: MilestoneStatus;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  scopes_completed: string[];
  notes: string[];
  last_event_id: string | null;
}

export interface MilestoneHistoryRowResponse {
  id: number;
  project_id: string;
  milestone_id: string;
  event_id: string | null;
  changed_at: string;
  old_status: MilestoneStatus;
  new_status: MilestoneStatus;
  old_progress: number;
  new_progress: number;
  note: string | null;
}

export interface ProjectStateResponse {
  project_id: string;
  overall_progress_percent: number;
  summary: {
    total: number;
    completed: number;
    in_progress: number;
    delayed: number;
    not_started: number;
  };
  milestones: MilestoneStateResponse[];
  unmapped_activities: string[];
  general_delay_events: number;
  events_pending_review: number;
  messages_not_understood: number;
  events_total: number;
  progress_note: string | null;
  history: MilestoneHistoryRowResponse[] | null;
}

export interface ImportResponse {
  project_id: string;
  batch_id: number;
  source: 'paste' | 'file' | string;
  filename: string | null;
  date_order: 'dmy' | 'mdy' | string;
  date_order_ambiguous: boolean;
  messages: ImportMessagesCounts;
  events: ImportEventsCounts;
  llm: ImportLlmSummary;
  warnings: string[];
  dates_affected: string[];
  latest_report: DailyReportResponse | null;
  milestone_changes: MilestoneChangeResponse[];
  project_state: ProjectStateResponse;
}

export interface RecomputeResponse {
  project_state: ProjectStateResponse;
  milestone_changes: MilestoneChangeResponse[];
}

// ---------------------------------------------------------------------------
// Normalized UI View Models (strictly mapped from contract responses)
// ---------------------------------------------------------------------------

export interface NormalizedHealth {
  online: boolean;
  statusLabel: string;
  version?: string;
  databaseConnected?: boolean;
  databaseError?: string;
  schemaVersion?: number | string;
  expectedSchemaVersion?: number | string;
  llmEnabled?: boolean;
  llmConfigured?: boolean;
  llmNote?: string;
  extraFields: Array<{ key: string; value: string }>;
  checkedAt: string;
  raw: unknown;
}

export type EventCategory =
  | 'accepted'
  | 'needs_review'
  | 'not_understood'
  | 'duplicate_ignored'
  | 'possible_duplicate';

export interface NormalizedExtractedEvent {
  id?: string | number;
  category: EventCategory;
  categoryLabel: string;
  eventType?: string;
  status?: string;
  summary?: string;
  rawMessage?: string;
  sender?: string;
  timestamp?: string;
  confidence?: number;
  reason?: string;
  milestoneName?: string;
  milestoneEffect?: string;
  extractionMethod?: string;
  flags?: string[];
  raw: Record<string, unknown>;
}

export interface NormalizedMilestoneChange {
  milestoneId?: string | number;
  milestoneName: string;
  previousStatus?: string;
  newStatus?: string;
  previousPct?: number;
  newPct?: number;
  raw: Record<string, unknown>;
}

export interface NormalizedMilestone {
  id: string;
  name: string;
  status: string;
  completionPct: number;
  startedAt?: string | null;
  completedAt?: string | null;
  scopesCompleted: string[];
  notes: string[];
  lastEventId?: string | null;
  raw: Record<string, unknown>;
}

export interface NormalizedMilestoneHistoryEntry {
  id: number | string;
  milestoneId: string;
  milestoneName: string;
  eventId?: string | null;
  previousStatus?: string;
  newStatus?: string;
  previousPct?: number;
  newPct?: number;
  note?: string | null;
  changedAt?: string;
  raw: Record<string, unknown>;
}

export interface NormalizedProjectState {
  projectId: string;
  overallProgressPct: number;
  totalMilestones: number;
  completedMilestones: number;
  inProgressMilestones: number;
  delayedMilestones: number;
  notStartedMilestones: number;
  milestones: NormalizedMilestone[];
  unmappedActivities: string[];
  generalDelayEvents?: number;
  eventsPendingReview?: number;
  messagesNotUnderstood?: number;
  eventsTotal?: number;
  progressNote?: string | null;
  history: NormalizedMilestoneHistoryEntry[] | null;
  raw: unknown;
}

export interface ReportEntryItem {
  id?: string;
  text: string;
  evidence?: string | null;
  meta?: string;
  status?: string;
  sender?: string | null;
  timestamp?: string | null;
  confidence?: number | null;
  milestone?: string | null;
  milestoneEffect?: string | null;
  extractionMethod?: string | null;
  progressPct?: number;
  progressBasis?: string;
  notes?: string[];
  reason?: string | null;
  kind?: string;
  flags?: string[];
  raw?: unknown;
}

export interface NormalizedLabourSection {
  reports: number;
  maxWorkers: number | null;
  latestWorkers: number | null;
  items: ReportEntryItem[];
}

export interface NormalizedDailyReport {
  projectId?: string;
  reportDate?: string;
  generatedAt?: string;
  overallProgressPct?: number;
  counts?: {
    acceptedEvents: number;
    needsReview: number;
    messages: number;
  };
  duplicatesIgnored?: number;
  extractionMethod?: string;
  workCompleted?: ReportEntryItem[];
  workStarted?: ReportEntryItem[];
  workInProgress?: ReportEntryItem[];
  plannedWork?: ReportEntryItem[];
  materialsReceived?: ReportEntryItem[];
  materialsExpected?: ReportEntryItem[];
  materialDelaysOrShortages?: ReportEntryItem[];
  materialsRequested?: ReportEntryItem[];
  labour?: NormalizedLabourSection;
  importantSiteIssues?: ReportEntryItem[];
  needsSupervisorReview?: ReportEntryItem[];
  markdown?: string;
  raw: unknown;
}

export interface NormalizedImportResult {
  projectId?: string;
  batchId?: number;
  source?: string;
  filename?: string | null;
  dateOrder?: string;
  dateOrderAmbiguous?: boolean;
  messagesParsed?: number;
  systemMessages?: number;
  mediaDeletedMessages?: number;
  alreadyImportedMessages?: number;
  processedMessages?: number;
  noTimestampMessages?: number;
  eventsCreated?: number;
  acceptedEventsCount?: number;
  needsReviewCount?: number;
  notUnderstoodCount?: number;
  duplicatesIgnoredCount?: number;
  possibleDuplicatesCount?: number;
  llmExtractionMode?: string;
  llmEnabled?: boolean;
  llmUsed?: boolean;
  llmCalls?: number;
  llmFailures?: number;
  warnings: string[];
  affectedDates: string[];
  events: NormalizedExtractedEvent[];
  milestoneChanges: NormalizedMilestoneChange[];
  projectState?: NormalizedProjectState;
  latestReport?: NormalizedDailyReport;
  raw: unknown;
}

export interface NormalizedRecomputeResult {
  projectState?: NormalizedProjectState;
  milestoneChanges: NormalizedMilestoneChange[];
  raw: unknown;
}
