import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatApiError,
  normalizeDailyReport,
  normalizeHealthResponse,
  normalizeImportResponse,
  normalizeProjectState,
  normalizeRecomputeResponse,
  validateProjectId,
} from './apiAdapters';

test('validateProjectId enforces ^[A-Za-z0-9_-]{1,64}$', () => {
  assert.equal(validateProjectId('demo-site_01'), null);
  assert.notEqual(validateProjectId(''), null);
  assert.notEqual(validateProjectId('has space'), null);
  assert.notEqual(validateProjectId('bad/slash'), null);
  assert.notEqual(validateProjectId('a'.repeat(65)), null);
});

test('normalizeHealthResponse maps verified GET /health ok and degraded shapes', () => {
  const ok = normalizeHealthResponse(
    {
      status: 'ok',
      version: '1.0.0',
      database: {
        ok: true,
        schema_version: 1,
        expected_schema_version: 1,
      },
      llm: {
        enabled: false,
        configured: false,
        note: 'Rules always run; the LLM is only used for unparseable lines when enabled.',
      },
    },
    '2026-11-24T09:00:00Z'
  );

  assert.equal(ok.online, true);
  assert.equal(ok.statusLabel, 'ok');
  assert.equal(ok.version, '1.0.0');
  assert.equal(ok.databaseConnected, true);
  assert.equal(ok.schemaVersion, 1);
  assert.equal(ok.expectedSchemaVersion, 1);
  assert.equal(ok.llmEnabled, false);
  assert.equal(ok.llmConfigured, false);
  assert.match(ok.llmNote ?? '', /Rules always run/);

  const degraded = normalizeHealthResponse({
    status: 'degraded',
    version: '1.0.0',
    database: { ok: false, error: 'unable to open database file' },
    llm: { enabled: false, configured: false },
  });
  assert.equal(degraded.statusLabel, 'degraded');
  assert.equal(degraded.databaseConnected, false);
  assert.equal(degraded.databaseError, 'unable to open database file');
});

test('normalizeImportResponse maps verified POST /api/v1/whatsapp/import payload', () => {
  const res = normalizeImportResponse({
    project_id: 'demo-site',
    batch_id: 1,
    source: 'paste',
    filename: null,
    date_order: 'dmy',
    date_order_ambiguous: true,
    messages: {
      parsed: 5,
      system: 0,
      media_or_deleted: 0,
      already_imported: 0,
      processed: 5,
      no_timestamp: 0,
    },
    events: {
      created: 5,
      accepted: 4,
      needs_review: 0,
      not_understood: 1,
      duplicates_ignored: 0,
      possible_duplicates: 0,
    },
    llm: {
      enabled: false,
      used: false,
      calls: 0,
      failures: 0,
      events: 0,
      mode: 'rules',
    },
    warnings: [
      'Date format is ambiguous (every date has day and month <= 12); day-first (DD/MM) was assumed.',
    ],
    dates_affected: ['2024-08-12'],
    latest_report: {
      project_id: 'demo-site',
      report_date: '2024-08-12',
      generated_at: '2026-11-22T15:58:41',
      overall_progress_percent: 4.55,
      counts: { accepted_events: 4, needs_review: 1, messages: 5 },
      work_completed: [],
      work_started: [
        {
          event_id: 'd670e3f9-1f5c-407b-8306-b047fd87cdc9',
          description: 'Work started — ground floor brickwork',
          sender: 'Ramesh Kumar',
          time: '09:15',
          confidence: 0.85,
          evidence: 'ground floor brickwork shuru ho gaya',
          extraction_method: 'rules',
          milestone: 'Brickwork',
          milestone_effect: 'Brickwork: not_started -> in_progress',
        },
      ],
      work_in_progress: [
        {
          milestone_id: 'brickwork',
          name: 'Brickwork',
          progress_percent: 0.0,
          progress_basis: 'not_reported',
          notes: [],
        },
        {
          milestone_id: 'waterproofing',
          name: 'Waterproofing',
          progress_percent: 50.0,
          progress_basis: 'reported',
          notes: [],
        },
      ],
      work_planned: [],
      material_received: [],
      material_expected: [
        {
          event_id: '79788fa3-559d-4c3e-acf0-05e31cd3528f',
          description: 'Material expected — cement (13 Aug)',
          sender: 'Suresh Contractor',
          time: '09:40',
          confidence: 0.9,
          evidence: 'cement kal ayega',
          extraction_method: 'rules',
          milestone: null,
          milestone_effect: null,
        },
      ],
      material_delays: [],
      material_requested: [],
      labour: {
        reports: 1,
        max_workers: 22,
        latest_workers: 22,
        items: [
          {
            event_id: '319728e7-4193-4760-b7ef-b551c7afcbac',
            description: 'Labour update — 22 workers',
            sender: 'Site Supervisor',
            time: '10:05',
            confidence: 0.85,
            evidence: '22 labour aaye',
            extraction_method: 'rules',
            milestone: null,
            milestone_effect: null,
          },
        ],
      },
      site_issues: [],
      needs_review: [
        {
          kind: 'not_understood',
          text: 'brickwork complete nahi hua',
          sender: 'Ramesh Kumar',
          time: '17:10',
          reason:
            'Looks like something was NOT done/received (negation) - no event type exists for that, so it was not extracted.',
          proposed: null,
          flags: ['not_understood'],
        },
      ],
      duplicates_ignored: 0,
      extraction_method: 'rules',
      markdown: '# Daily Site Report — demo-site — 2024-08-12',
    },
    milestone_changes: [
      {
        milestone_id: 'brickwork',
        name: 'Brickwork',
        old_status: 'not_started',
        new_status: 'in_progress',
        old_progress: 0.0,
        new_progress: 0.0,
      },
      {
        milestone_id: 'waterproofing',
        name: 'Waterproofing',
        old_status: 'not_started',
        new_status: 'in_progress',
        old_progress: 0.0,
        new_progress: 50.0,
      },
    ],
    project_state: {
      project_id: 'demo-site',
      overall_progress_percent: 4.55,
      summary: { total: 11, completed: 0, in_progress: 2, delayed: 0, not_started: 9 },
      milestones: [
        {
          milestone_id: 'brickwork',
          name: 'Brickwork',
          status: 'in_progress',
          progress_percent: 0.0,
          started_at: '2024-08-12T09:15:00',
          completed_at: null,
          scopes_completed: [],
          notes: [],
          last_event_id: 'd670e3f9-1f5c-407b-8306-b047fd87cdc9',
        },
        {
          milestone_id: 'waterproofing',
          name: 'Waterproofing',
          status: 'in_progress',
          progress_percent: 50.0,
          started_at: '2024-08-12T16:30:00',
          completed_at: null,
          scopes_completed: [],
          notes: [],
          last_event_id: '360bdf3e-0227-4054-b600-ca7da3e9ca8d',
        },
      ],
      unmapped_activities: [],
      general_delay_events: 0,
      events_pending_review: 0,
      messages_not_understood: 1,
      events_total: 5,
      progress_note: 'Progress counts only completed milestones and percentages explicitly reported.',
      history: null,
    },
  });

  assert.equal(res.projectId, 'demo-site');
  assert.equal(res.batchId, 1);
  assert.equal(res.messagesParsed, 5);
  assert.equal(res.processedMessages, 5);
  assert.equal(res.alreadyImportedMessages, 0);
  assert.equal(res.acceptedEventsCount, 4);
  assert.equal(res.notUnderstoodCount, 1);
  assert.equal(res.llmExtractionMode, 'rules');
  assert.equal(res.dateOrderAmbiguous, true);
  assert.deepEqual(res.affectedDates, ['2024-08-12']);
  assert.equal(res.milestoneChanges.length, 2);
  assert.equal(res.milestoneChanges[1].newPct, 50);
  assert.equal(res.projectState?.overallProgressPct, 4.55);
  assert.equal(res.projectState?.totalMilestones, 11);
  // 3 accepted items from latest_report (work_started + material_expected + labour) + 1 not_understood review item
  assert.equal(res.events.length, 4);
  assert.equal(res.events[0].category, 'accepted');
  assert.equal(res.events[3].category, 'not_understood');
});

test('normalizeDailyReport maps verified JSON DailyReport and text/markdown response', () => {
  const report = normalizeDailyReport({
    project_id: 'demo-site',
    report_date: '2024-08-12',
    generated_at: '2026-11-22T15:58:41',
    overall_progress_percent: 4.55,
    counts: { accepted_events: 4, needs_review: 1, messages: 5 },
    work_completed: [],
    work_started: [],
    work_in_progress: [
      {
        milestone_id: 'waterproofing',
        name: 'Waterproofing',
        progress_percent: 50.0,
        progress_basis: 'reported',
        notes: ['Terrace section'],
      },
    ],
    work_planned: [
      {
        event_id: 'ev-plan',
        description: 'Work planned — plastering tomorrow',
        sender: 'Ramesh',
        time: '16:00',
        confidence: 0.9,
        evidence: 'kal plastering start hoga',
        extraction_method: 'rules',
        milestone: 'Plastering',
        milestone_effect: null,
      },
    ],
    material_received: [],
    material_expected: [],
    material_delays: [
      {
        event_id: 'ev-delay',
        description: 'Material delay — cement',
        sender: 'Mahesh',
        time: '14:10',
        confidence: 0.88,
        evidence: 'cement aaya nahi',
        extraction_method: 'rules',
        milestone: null,
        milestone_effect: null,
      },
    ],
    material_requested: [],
    labour: {
      reports: 1,
      max_workers: 22,
      latest_workers: 22,
      items: [
        {
          event_id: 'ev-lab',
          description: 'Labour update — 22 workers',
          sender: 'Site Supervisor',
          time: '10:05',
          confidence: 0.85,
          evidence: '22 labour aaye',
          extraction_method: 'rules',
          milestone: null,
          milestone_effect: null,
        },
      ],
    },
    site_issues: [],
    needs_review: [],
    duplicates_ignored: 0,
    extraction_method: 'rules',
    markdown: '# Daily Site Report — demo-site — 2024-08-12',
  });

  assert.equal(report.overallProgressPct, 4.55);
  assert.equal(report.counts?.acceptedEvents, 4);
  assert.equal(report.workInProgress?.[0].progressPct, 50);
  assert.deepEqual(report.workInProgress?.[0].notes, ['Terrace section']);
  assert.equal(report.plannedWork?.[0].evidence, 'kal plastering start hoga');
  assert.equal(report.materialDelaysOrShortages?.[0].evidence, 'cement aaya nahi');
  assert.equal(report.labour?.maxWorkers, 22);
  assert.equal(report.labour?.items.length, 1);

  const mdOnly = normalizeDailyReport('# Daily Site Report — demo-site — 2024-08-12');
  assert.equal(mdOnly.markdown, '# Daily Site Report — demo-site — 2024-08-12');
});

test('normalizeProjectState resolves milestone names in history and normalizeRecomputeResponse maps project_state', () => {
  const state = normalizeProjectState({
    project_id: 'demo-site',
    overall_progress_percent: 4.55,
    summary: { total: 11, completed: 0, in_progress: 2, delayed: 0, not_started: 9 },
    milestones: [
      {
        milestone_id: 'brickwork',
        name: 'Brickwork',
        status: 'in_progress',
        progress_percent: 0.0,
        started_at: '2024-08-12T09:15:00',
        completed_at: null,
        scopes_completed: ['Ground floor'],
        notes: ['Started by Ramesh'],
        last_event_id: 'ev-1',
      },
    ],
    unmapped_activities: [],
    general_delay_events: 0,
    events_pending_review: 0,
    messages_not_understood: 1,
    events_total: 5,
    progress_note: 'Note text',
    history: [
      {
        id: 1,
        project_id: 'demo-site',
        milestone_id: 'brickwork',
        event_id: 'ev-1',
        changed_at: '2024-08-12T09:15:00',
        old_status: 'not_started',
        new_status: 'in_progress',
        old_progress: 0.0,
        new_progress: 0.0,
        note: null,
      },
    ],
  });

  assert.equal(state.overallProgressPct, 4.55);
  assert.equal(state.totalMilestones, 11);
  assert.deepEqual(state.milestones[0].notes, ['Started by Ramesh']);
  assert.equal(state.history?.[0].milestoneName, 'Brickwork');

  const recompute = normalizeRecomputeResponse({
    project_state: {
      project_id: 'demo-site',
      overall_progress_percent: 4.55,
      summary: { total: 11, completed: 0, in_progress: 2, delayed: 0, not_started: 9 },
      milestones: [],
      unmapped_activities: [],
      history: null,
    },
    milestone_changes: [],
  });
  assert.equal(recompute.projectState?.overallProgressPct, 4.55);
  assert.equal(recompute.milestoneChanges.length, 0);
});

test('formatApiError handles verified { detail: { code, message } }, 413, 422 array, 500 text, and network errors', () => {
  const err404 = formatApiError(404, {
    detail: {
      code: 'project_not_found',
      message: "No project 'nope'. Import a chat first.",
    },
  });
  assert.equal(err404.kind, 'NOT_FOUND');
  assert.equal(err404.code, 'project_not_found');
  assert.equal(err404.message, "No project 'nope'. Import a chat first.");

  const err413 = formatApiError(413, {
    detail: { code: 'file_too_large', message: 'File exceeds 5,000,000 byte limit.' },
  });
  assert.equal(err413.kind, 'PAYLOAD_TOO_LARGE');
  assert.equal(err413.code, 'file_too_large');

  const err422Array = formatApiError(422, {
    detail: [
      {
        type: 'missing',
        loc: ['body', 'chat_text'],
        msg: 'Field required',
      },
    ],
  });
  assert.equal(err422Array.kind, 'VALIDATION_ERROR');
  assert.equal(err422Array.message, 'Field required');
  assert.equal(err422Array.details?.[0], 'body.chat_text: Field required');

  const err500 = formatApiError(500, 'Internal Server Error');
  assert.equal(err500.kind, 'SERVER_ERROR');
  assert.equal(err500.message, 'Internal Server Error');

  const errNet = formatApiError(undefined, new TypeError('Failed to fetch'));
  assert.equal(errNet.kind, 'NETWORK_OR_CORS');
});
