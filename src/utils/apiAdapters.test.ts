import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatApiError,
  normalizeDailyReport,
  normalizeHealthResponse,
  normalizeImportResponse,
  normalizeProjectState,
  normalizeRecomputeResponse,
} from './apiAdapters';

test('normalizeHealthResponse preserves returned fields and does not fabricate missing ones', () => {
  const health = normalizeHealthResponse(
    {
      status: 'ok',
      database_connected: true,
      database_schema_version: 'v3',
      llm_enabled: false,
    },
    '2026-11-15T20:00:00Z'
  );

  assert.equal(health.online, true);
  assert.equal(health.statusLabel, 'ok');
  assert.equal(health.databaseConnected, true);
  assert.equal(health.schemaVersion, 'v3');
  assert.equal(health.llmEnabled, false);
  assert.equal(health.llmModel, undefined);
});

test('normalizeImportResponse separates accepted, needs_review, not_understood, duplicate_ignored, and possible_duplicate', () => {
  const res = normalizeImportResponse({
    project_id: 'sw-basic',
    messages_parsed: 6,
    system_messages: 1,
    media_deleted_messages: 1,
    processed_messages: 4,
    already_imported_messages: 2,
    accepted_events_count: 1,
    needs_review_count: 1,
    not_understood_count: 1,
    duplicates_ignored: 1,
    possible_duplicates: 1,
    llm_extraction_mode: 'hybrid_rules',
    date_order_ambiguous: true,
    warnings: ['Ambiguous date order DD/MM vs MM/DD detected; defaulting to DD/MM.'],
    affected_dates: ['2024-08-12'],
    events: [
      {
        id: 101,
        review_status: 'accepted',
        event_type: 'work_progress',
        milestone_name: 'Waterproofing',
        completion_pct: 50,
        summary: 'Waterproofing 50% complete',
        raw_message: 'Waterproofing 50% complete hai',
        sender: 'Ramesh',
      },
      {
        id: 102,
        review_status: 'needs_review',
        summary: 'Unclear message requiring supervisor check',
        raw_message: 'Kal wala dekh lena sir',
        reason: 'Ambiguous scope',
      },
      {
        id: 103,
        review_status: 'not_understood',
        raw_message: 'Ok done',
      },
      {
        id: 104,
        review_status: 'duplicate_ignored',
        raw_message: 'Ground floor brickwork started',
      },
      {
        id: 105,
        review_status: 'possible_duplicate',
        raw_message: 'Brickwork started today',
        reason: 'Similar message within 2 hours',
      },
    ],
    milestone_changes: [
      {
        milestone_name: 'Waterproofing',
        previous_status: 'not_started',
        new_status: 'in_progress',
        previous_pct: 0,
        new_pct: 50,
      },
    ],
  });

  assert.equal(res.messagesParsed, 6);
  assert.equal(res.alreadyImportedMessages, 2);
  assert.equal(res.dateOrderAmbiguous, true);
  assert.equal(res.warnings.length, 1);
  assert.equal(res.events.length, 5);
  assert.deepEqual(
    res.events.map((e) => e.category),
    ['accepted', 'needs_review', 'not_understood', 'duplicate_ignored', 'possible_duplicate']
  );
  assert.equal(res.events[0].progressPct, 50);
  assert.equal(res.milestoneChanges[0].newPct, 50);
  assert.equal(res.milestoneChanges[0].newStatus, 'in_progress');
});

test('normalizeDailyReport keeps future work and material negation in exact backend sections', () => {
  const report = normalizeDailyReport({
    project_id: 'sw-basic',
    report_date: '2024-08-12',
    overall_progress_pct: 42,
    work_started: ['Ground floor brickwork started'],
    work_in_progress: [{ summary: 'Waterproofing', completion_pct: 50 }],
    planned_work: ['Kal brickwork start hoga'],
    materials_received: [],
    material_delays_or_shortages: ['Cement aaya nahi (not received)'],
    messages_requiring_supervisor_review: [{ raw_message: 'Check beam alignment', reason: 'Unclear floor' }],
  });

  assert.equal(report.reportDate, '2024-08-12');
  assert.equal(report.overallProgressPct, 42);
  assert.equal(report.workStarted?.length, 1);
  assert.equal(report.workInProgress?.[0].progressPct, 50);
  assert.equal(report.plannedWork?.[0].text, 'Kal brickwork start hoga');
  assert.equal(report.materialsReceived?.length, 0);
  assert.equal(report.materialDelaysOrShortages?.[0].text, 'Cement aaya nahi (not received)');
  assert.equal(report.needsSupervisorReview?.[0].reason, 'Unclear floor');
  assert.equal(report.workCompleted, undefined);
});

test('normalizeDailyReport supports raw markdown string response', () => {
  const report = normalizeDailyReport('# Daily Site Report\n\n- **Progress:** 42%');
  assert.equal(report.markdown, '# Daily Site Report\n\n- **Progress:** 42%');
});

test('normalizeProjectState and normalizeRecomputeResponse handle milestones and history', () => {
  const state = normalizeProjectState({
    project_id: 'sw-basic',
    overall_progress_pct: 50,
    total_milestones: 4,
    completed_milestones: 1,
    in_progress_milestones: 1,
    delayed_milestones: 1,
    not_started_milestones: 1,
    milestones: [
      { milestone_name: 'Foundation', status: 'completed', completion_pct: 100 },
      { milestone_name: 'Waterproofing', status: 'in_progress', completion_pct: 50, notes: '50% complete' },
    ],
    history: [
      {
        milestone_name: 'Waterproofing',
        previous_pct: 0,
        new_pct: 50,
        new_status: 'in_progress',
        changed_at: '2024-08-12T10:00:00Z',
      },
    ],
  });

  assert.equal(state.overallProgressPct, 50);
  assert.equal(state.milestones.length, 2);
  assert.equal(state.milestones[1].completionPct, 50);
  assert.equal(state.history?.length, 1);

  const recompute = normalizeRecomputeResponse({
    project_id: 'sw-basic',
    milestones_updated: 2,
    milestone_changes: [{ milestone_name: 'Brickwork', previous_pct: 0, new_pct: 25 }],
  });
  assert.equal(recompute.milestonesUpdated, 2);
  assert.equal(recompute.milestoneChanges[0].newPct, 25);
});

test('formatApiError formats FastAPI 422, 404, 500, and network errors accurately', () => {
  const err422 = formatApiError(422, {
    detail: [{ loc: ['body', 'project_id'], msg: 'Field required' }],
  });
  assert.equal(err422.kind, 'VALIDATION_ERROR');
  assert.equal(err422.details?.[0], 'body.project_id: Field required');

  const err404 = formatApiError(404, { detail: 'Project sw-missing not found' });
  assert.equal(err404.kind, 'NOT_FOUND');
  assert.equal(err404.message, 'Project sw-missing not found');

  const errNet = formatApiError(undefined, new TypeError('Failed to fetch'));
  assert.equal(errNet.kind, 'NETWORK_OR_CORS');
});
