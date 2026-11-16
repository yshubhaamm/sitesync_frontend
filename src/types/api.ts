export type NavSection = 'dashboard' | 'import' | 'progress' | 'reports';

export type ApiErrorKind =
  | 'NETWORK_OR_CORS'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'HTTP_ERROR';

export interface ApiErrorInfo {
  kind: ApiErrorKind;
  status?: number;
  message: string;
  details?: string[];
  raw?: unknown;
}

export interface NormalizedHealth {
  online: boolean;
  statusLabel?: string;
  databaseConnected?: boolean;
  databaseLabel?: string;
  schemaVersion?: string | number;
  llmEnabled?: boolean;
  llmModel?: string;
  extraFields: Array<{ key: string; value: string }>;
  checkedAt: string;
  raw: unknown;
}

export interface WhatsAppImportRequest {
  project_id: string;
  chat_text: string;
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
  date?: string;
  confidence?: number;
  reason?: string;
  milestoneName?: string;
  progressPct?: number;
  raw: Record<string, unknown>;
}

export interface NormalizedMilestoneChange {
  milestoneId?: string | number;
  milestoneName: string;
  previousStatus?: string;
  newStatus?: string;
  previousPct?: number;
  newPct?: number;
  notes?: string;
  reason?: string;
  changedAt?: string;
  raw: Record<string, unknown>;
}

export interface NormalizedMilestone {
  id?: string | number;
  name: string;
  status: string;
  completionPct?: number;
  notes?: string;
  updatedAt?: string;
  raw: Record<string, unknown>;
}

export interface NormalizedMilestoneHistoryEntry {
  id?: string | number;
  milestoneName: string;
  previousStatus?: string;
  newStatus?: string;
  previousPct?: number;
  newPct?: number;
  notes?: string;
  reason?: string;
  changedAt?: string;
  sourceMessage?: string;
  raw: Record<string, unknown>;
}

export interface NormalizedProjectState {
  projectId?: string;
  overallProgressPct?: number;
  totalMilestones?: number;
  completedMilestones?: number;
  inProgressMilestones?: number;
  delayedMilestones?: number;
  notStartedMilestones?: number;
  milestones: NormalizedMilestone[];
  history?: NormalizedMilestoneHistoryEntry[];
  lastUpdated?: string;
  raw: unknown;
}

export interface ReportEntryItem {
  text: string;
  meta?: string;
  status?: string;
  sender?: string;
  timestamp?: string;
  progressPct?: number;
  reason?: string;
  raw?: unknown;
}

export interface NormalizedDailyReport {
  projectId?: string;
  reportDate?: string;
  overallProgressPct?: number;
  summary?: string;
  workCompleted?: ReportEntryItem[];
  workStarted?: ReportEntryItem[];
  workInProgress?: ReportEntryItem[];
  plannedWork?: ReportEntryItem[];
  materialsReceived?: ReportEntryItem[];
  materialsExpected?: ReportEntryItem[];
  materialDelaysOrShortages?: ReportEntryItem[];
  materialsRequested?: ReportEntryItem[];
  labourUpdates?: ReportEntryItem[];
  importantSiteIssues?: ReportEntryItem[];
  needsSupervisorReview?: ReportEntryItem[];
  markdown?: string;
  extraSections: Array<{ key: string; label: string; value: unknown }>;
  raw: unknown;
}

export interface NormalizedImportResult {
  projectId?: string;
  messagesParsed?: number;
  systemMessages?: number;
  mediaDeletedMessages?: number;
  processedMessages?: number;
  alreadyImportedMessages?: number;
  acceptedEventsCount?: number;
  needsReviewCount?: number;
  notUnderstoodCount?: number;
  duplicatesIgnoredCount?: number;
  possibleDuplicatesCount?: number;
  llmExtractionMode?: string;
  dateOrderAmbiguous?: boolean;
  warnings: string[];
  affectedDates: string[];
  events: NormalizedExtractedEvent[];
  milestoneChanges: NormalizedMilestoneChange[];
  projectState?: NormalizedProjectState;
  latestReport?: NormalizedDailyReport;
  raw: unknown;
}

export interface NormalizedRecomputeResult {
  projectId?: string;
  message?: string;
  milestonesUpdated?: number;
  overallProgressPct?: number;
  milestoneChanges: NormalizedMilestoneChange[];
  projectState?: NormalizedProjectState;
  raw: unknown;
}
