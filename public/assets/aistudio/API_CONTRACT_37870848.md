# SiteSync AI — API contract for the frontend

Verified against the running code: every example below is a **real response** from this backend, and an automated check asserted that each real response has exactly the keys/types in `sitesync-api.types.ts`. In the JSON examples, long arrays are shortened to 3 items (e.g. `milestones` really has 11) — the structure is unchanged.

## 1. Basics

| | |
|---|---|
| **Base URL (local)** | `http://127.0.0.1:8000` |
| **Vite variable** | `VITE_API_BASE_URL=http://127.0.0.1:8000` |
| Format | JSON (UTF-8). Uploads use `multipart/form-data`. The Markdown report is `text/markdown`. |
| Authentication | **None.** No cookies, no tokens — do **not** use `credentials: "include"`. |
| CORS | Allowed origins: `http://localhost:5173`, `http://127.0.0.1:5173` (configurable). Methods `GET, POST, OPTIONS`; request headers `Content-Type`, `Accept`. |
| Dates | `YYYY-MM-DD` (query/body/`report_date`). Timestamps are ISO-8601 **without time zone**, local time of the chat (e.g. `2024-08-12T09:15:00`). |
| `project_id` | `^[A-Za-z0-9_-]{1,64}$`. A project is **created automatically on its first import**; until then every other endpoint returns 404 `project_not_found`. |
| Limits (defaults) | pasted text ≤ 2,000,000 chars; uploaded file ≤ 5,000,000 bytes, `.txt`, UTF-8 |
| Processing | Synchronous (about 1 s per 1,000 messages): show a loading state during import. Re-importing the same chat is safe (already-imported messages are skipped). |

## 2. Endpoint index

| # | Method | URL | Purpose | Changes data? |
|---|---|---|---|---|
| 1 | GET | `/health` | service / database / LLM status | **No** (read-only) |
| 2 | POST | `/api/v1/whatsapp/import` | import pasted chat text | **Yes** — writes messages, events, milestones, history, daily reports |
| 3 | POST | `/api/v1/whatsapp/import-file` | import an exported `.txt` chat | **Yes** — same as #2 |
| 4 | GET | `/api/v1/reports/daily` | daily site report | Reads events. ⚠ Also **saves a cached copy** of the report in the `daily_reports` table (idempotent; never changes events or milestones) |
| 5 | GET | `/api/v1/projects/{project_id}/state` | milestones + overall progress | **No** (read-only) |
| 6 | POST | `/api/v1/projects/{project_id}/milestones/recompute` | rebuild milestone state/history from stored events | **Yes** — rewrites *derived* milestone state/history (idempotent; events are never touched) |

Framework routes (not part of the app contract): `GET /docs` (Swagger UI), `GET /redoc`, `GET /openapi.json` (can be used to auto-generate a client).

## 3. Endpoints

### 3.1 `GET /health`
No parameters. Use it as a connectivity check.

Response **200** (`HealthResponse`):
```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": {
    "ok": true,
    "schema_version": 1,
    "expected_schema_version": 1
  },
  "llm": {
    "enabled": false,
    "configured": false,
    "note": "Rules always run; the LLM is only used for unparseable lines when enabled."
  }
}
```
`status` is `"ok"` or `"degraded"` (database unreachable; then `database` = `{ok:false, error}`). Errors: none expected.

### 3.2 `POST /api/v1/whatsapp/import`
**Changes data.** Content-Type `application/json`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `project_id` | string | **yes** | `^[A-Za-z0-9_-]{1,64}$` |
| `chat_text` | string | **yes** | the pasted WhatsApp chat; must not be blank |
| `reference_date` | `YYYY-MM-DD` | no | only used for lines that carry no usable date |

Example request:
```json
{
  "project_id": "demo-site",
  "chat_text": "12/08/24, 9:15 am - Ramesh Kumar: ground floor brickwork shuru ho gaya\n12/08/24, 9:40 am - Suresh Contractor: cement kal ayega\n12/08/24, 10:05 am - Site Supervisor: 22 labour aaye\n12/08/24, 4:30 pm - Ramesh Kumar: Waterproofing 50% complete hai\n12/08/24, 5:10 pm - Ramesh Kumar: brickwork complete nahi hua\n"
}
```
Response **200** (`ImportResponse`, shortened):
```json
{
  "project_id": "demo-site",
  "batch_id": 1,
  "source": "paste",
  "filename": null,
  "date_order": "dmy",
  "date_order_ambiguous": true,
  "messages": {
    "parsed": 5,
    "system": 0,
    "media_or_deleted": 0,
    "already_imported": 0,
    "processed": 5,
    "no_timestamp": 0
  },
  "events": {
    "created": 5,
    "accepted": 4,
    "needs_review": 0,
    "not_understood": 1,
    "duplicates_ignored": 0,
    "possible_duplicates": 0
  },
  "llm": {
    "enabled": false,
    "used": false,
    "calls": 0,
    "failures": 0,
    "events": 0,
    "mode": "rules"
  },
  "warnings": [
    "Date format is ambiguous (every date has day and month <= 12); day-first (DD/MM) was assumed."
  ],
  "dates_affected": [
    "2024-08-12"
  ],
  "latest_report": {
    "project_id": "demo-site",
    "report_date": "2024-08-12",
    "generated_at": "2026-11-22T15:58:41",
    "overall_progress_percent": 4.55,
    "counts": {
      "accepted_events": 4,
      "needs_review": 1,
      "messages": 5
    },
    "work_completed": [],
    "work_started": [
      {
        "event_id": "d670e3f9-1f5c-407b-8306-b047fd87cdc9",
        "description": "Work started — ground floor brickwork",
        "sender": "Ramesh Kumar",
        "time": "09:15",
        "confidence": 0.85,
        "evidence": "ground floor brickwork shuru ho gaya",
        "extraction_method": "rules",
        "milestone": "Brickwork",
        "milestone_effect": "Brickwork: not_started -> in_progress"
      }
    ],
    "work_in_progress": [
      {
        "milestone_id": "brickwork",
        "name": "Brickwork",
        "progress_percent": 0.0,
        "progress_basis": "not_reported",
        "notes": []
      },
      {
        "milestone_id": "waterproofing",
        "name": "Waterproofing",
        "progress_percent": 50.0,
        "progress_basis": "reported",
        "notes": []
      }
    ],
    "work_planned": [],
    "material_received": [],
    "material_expected": [
      {
        "event_id": "79788fa3-559d-4c3e-acf0-05e31cd3528f",
        "description": "Material expected — cement (13 Aug)",
        "sender": "Suresh Contractor",
        "time": "09:40",
        "confidence": 0.9,
        "evidence": "cement kal ayega",
        "extraction_method": "rules",
        "milestone": null,
        "milestone_effect": null
      }
    ],
    "material_delays": [],
    "material_requested": [],
    "labour": {
      "reports": 1,
      "max_workers": 22,
      "latest_workers": 22,
      "items": [
        {
          "event_id": "319728e7-4193-4760-b7ef-b551c7afcbac",
          "description": "Labour update — 22 workers",
          "sender": "Site Supervisor",
          "time": "10:05",
          "confidence": 0.85,
          "evidence": "22 labour aaye",
          "extraction_method": "rules",
          "milestone": null,
          "milestone_effect": null
        }
      ]
    },
    "site_issues": [],
    "needs_review": [
      {
        "kind": "not_understood",
        "text": "brickwork complete nahi hua",
        "sender": "Ramesh Kumar",
        "time": "17:10",
        "reason": "Looks like something was NOT done/received (negation) - no event type exists for that, so it was not extracted.",
        "proposed": null,
        "flags": [
          "not_understood"
        ]
      }
    ],
    "duplicates_ignored": 0,
    "extraction_method": "rules",
    "markdown": "# Daily Site Report — demo-site — 2024-08-12\n\n**Overall project progress (as of this date)…"
  },
  "milestone_changes": [
    {
      "milestone_id": "brickwork",
      "name": "Brickwork",
      "old_status": "not_started",
      "new_status": "in_progress",
      "old_progress": 0.0,
      "new_progress": 0.0
    },
    {
      "milestone_id": "waterproofing",
      "name": "Waterproofing",
      "old_status": "not_started",
      "new_status": "in_progress",
      "old_progress": 0.0,
      "new_progress": 50.0
    }
  ],
  "project_state": {
    "project_id": "demo-site",
    "overall_progress_percent": 4.55,
    "summary": {
      "total": 11,
      "completed": 0,
      "in_progress": 2,
      "delayed": 0,
      "not_started": 9
    },
    "milestones": [
      {
        "milestone_id": "brickwork",
        "name": "Brickwork",
        "status": "in_progress",
        "progress_percent": 0.0,
        "started_at": "2024-08-12T09:15:00",
        "completed_at": null,
        "scopes_completed": [],
        "notes": [],
        "last_event_id": "d670e3f9-1f5c-407b-8306-b047fd87cdc9"
      },
      {
        "milestone_id": "waterproofing",
        "name": "Waterproofing",
        "status": "in_progress",
        "progress_percent": 50.0,
        "started_at": "2024-08-12T16:30:00",
        "completed_at": null,
        "scopes_completed": [],
        "notes": [],
        "last_event_id": "360bdf3e-0227-4054-b600-ca7da3e9ca8d"
      },
      {
        "milestone_id": "excavation_foundation",
        "name": "Excavation & Foundation",
        "status": "not_started",
        "progress_percent": 0.0,
        "started_at": null,
        "completed_at": null,
        "scopes_completed": [],
        "notes": [],
        "last_event_id": null
      }
    ],
    "unmapped_activities": [],
    "general_delay_events": 0,
    "events_pending_review": 0,
    "messages_not_understood": 1,
    "events_total": 5,
    "progress_note": "Progress counts only completed milestones and percentages explicitly reported in the chat; a milestone that merely started shows its configured start value (default 0).",
    "history": null
  }
}
```
Field notes: `messages`/`events` are counters (all keys always present). `events.accepted`/`needs_review`/`not_understood` count new events by routing; `duplicates_ignored` are repeats of the same update; `latest_report` is the report of the newest day touched (null if the chat had no dated events); `milestone_changes` lists only milestones whose status/progress changed in this import; `project_state` is the full updated state (same shape as endpoint 5). `llm.mode` is `"rules"` unless an LLM really produced an event. `warnings` may contain e.g. an ambiguous-date-format notice — show it to the user.

Errors: `422 empty_input`, `422 no_whatsapp_messages_found`, `422 invalid_project_id`, `413 input_too_large`, `422` FastAPI validation (missing/mistyped field). Shapes in section 4.

### 3.3 `POST /api/v1/whatsapp/import-file`
**Changes data.** Content-Type `multipart/form-data` (let the browser set it — do **not** set the header manually).

| Form field | Type | Required | Notes |
|---|---|---|---|
| `project_id` | text | **yes** | same rule as above |
| `file` | file | **yes** | name must end in `.txt`; UTF-8 (BOM allowed); ≤ `max_upload_bytes` |
| `reference_date` | text `YYYY-MM-DD` | no | as above |

Example (browser):
```ts
const form = new FormData();
form.append("project_id", "demo-file");
form.append("file", fileInput.files[0]);   // e.g. "WhatsApp Chat with Site.txt"
const res = await fetch(`${BASE}/api/v1/whatsapp/import-file`, { method: "POST", body: form });
```
Response **200**: identical structure to 3.2 (`ImportResponse`), with `source: "file"` and `filename` set. Actual values for the example chat:
```json
{
  "project_id": "demo-file",
  "source": "file",
  "filename": "WhatsApp Chat.txt",
  "date_order": "dmy",
  "date_order_ambiguous": true,
  "messages": {
    "parsed": 5,
    "system": 0,
    "media_or_deleted": 0,
    "already_imported": 0,
    "processed": 5,
    "no_timestamp": 0
  },
  "events": {
    "created": 5,
    "accepted": 4,
    "needs_review": 0,
    "not_understood": 1,
    "duplicates_ignored": 0,
    "possible_duplicates": 0
  },
  "dates_affected": [
    "2024-08-12"
  ]
}
```
Errors: `422 unsupported_file_type`, `413 file_too_large`, `422 empty_input`, `422 invalid_encoding`, `422 no_whatsapp_messages_found`, `422 invalid_project_id`, `422` FastAPI validation.

### 3.4 `GET /api/v1/reports/daily`
Reads events (and saves a cached copy of the report — see index).

| Query param | Type | Required | Notes |
|---|---|---|---|
| `project_id` | string | **yes** | |
| `date` | `YYYY-MM-DD` | no | default = latest day that has dated events |
| `format` | `json` \| `markdown` | no | default `json`; any other value → 422 |

Example: `GET /api/v1/reports/daily?project_id=demo-site&date=2024-08-12`

Response **200** (`DailyReport`, shortened):
```json
{
  "project_id": "demo-site",
  "report_date": "2024-08-12",
  "generated_at": "2026-11-22T15:58:41",
  "overall_progress_percent": 4.55,
  "counts": {
    "accepted_events": 4,
    "needs_review": 1,
    "messages": 5
  },
  "work_completed": [],
  "work_started": [
    {
      "event_id": "d670e3f9-1f5c-407b-8306-b047fd87cdc9",
      "description": "Work started — ground floor brickwork",
      "sender": "Ramesh Kumar",
      "time": "09:15",
      "confidence": 0.85,
      "evidence": "ground floor brickwork shuru ho gaya",
      "extraction_method": "rules",
      "milestone": "Brickwork",
      "milestone_effect": "Brickwork: not_started -> in_progress"
    }
  ],
  "work_in_progress": [
    {
      "milestone_id": "brickwork",
      "name": "Brickwork",
      "progress_percent": 0.0,
      "progress_basis": "not_reported",
      "notes": []
    },
    {
      "milestone_id": "waterproofing",
      "name": "Waterproofing",
      "progress_percent": 50.0,
      "progress_basis": "reported",
      "notes": []
    }
  ],
  "work_planned": [],
  "material_received": [],
  "material_expected": [
    {
      "event_id": "79788fa3-559d-4c3e-acf0-05e31cd3528f",
      "description": "Material expected — cement (13 Aug)",
      "sender": "Suresh Contractor",
      "time": "09:40",
      "confidence": 0.9,
      "evidence": "cement kal ayega",
      "extraction_method": "rules",
      "milestone": null,
      "milestone_effect": null
    }
  ],
  "material_delays": [],
  "material_requested": [],
  "labour": {
    "reports": 1,
    "max_workers": 22,
    "latest_workers": 22,
    "items": [
      {
        "event_id": "319728e7-4193-4760-b7ef-b551c7afcbac",
        "description": "Labour update — 22 workers",
        "sender": "Site Supervisor",
        "time": "10:05",
        "confidence": 0.85,
        "evidence": "22 labour aaye",
        "extraction_method": "rules",
        "milestone": null,
        "milestone_effect": null
      }
    ]
  },
  "site_issues": [],
  "needs_review": [
    {
      "kind": "not_understood",
      "text": "brickwork complete nahi hua",
      "sender": "Ramesh Kumar",
      "time": "17:10",
      "reason": "Looks like something was NOT done/received (negation) - no event type exists for that, so it was not extracted.",
      "proposed": null,
      "flags": [
        "not_understood"
      ]
    }
  ],
  "duplicates_ignored": 0,
  "extraction_method": "rules",
  "markdown": "# Daily Site Report — demo-site — 2024-08-12\n\n**Overall project progress (as of this date)…"
}
```
A day with no chat updates returns **200** with empty sections (`counts.accepted_events = 0`). Sections are facts from *accepted* events only; uncertain items are in `needs_review` (`kind`: `low_confidence` | `not_understood`). Every item carries its chat `evidence`.

With `format=markdown` the response is **200 `text/markdown`** (read it with `response.text()`, not `.json()`), starting:
```
# Daily Site Report — demo-site — 2024-08-12

**Overall project progress (as of this date): 4.55%**  

## Work completed
- None reported.
…
```
Errors: `404 project_not_found`, `404 no_events` (no `date` given and the project has no dated events), `422 invalid_project_id`, `422` FastAPI validation (bad `date`/`format`).

### 3.5 `GET /api/v1/projects/{project_id}/state`
**Read-only.**

| Param | In | Required | Notes |
|---|---|---|---|
| `project_id` | path | **yes** | |
| `include_history` | query | no | boolean, default `false`; `true` adds the full milestone change history |

Example: `GET /api/v1/projects/demo-site/state`

Response **200** (`ProjectState`, shortened):
```json
{
  "project_id": "demo-site",
  "overall_progress_percent": 4.55,
  "summary": {
    "total": 11,
    "completed": 0,
    "in_progress": 2,
    "delayed": 0,
    "not_started": 9
  },
  "milestones": [
    {
      "milestone_id": "brickwork",
      "name": "Brickwork",
      "status": "in_progress",
      "progress_percent": 0.0,
      "started_at": "2024-08-12T09:15:00",
      "completed_at": null,
      "scopes_completed": [],
      "notes": [],
      "last_event_id": "d670e3f9-1f5c-407b-8306-b047fd87cdc9"
    },
    {
      "milestone_id": "waterproofing",
      "name": "Waterproofing",
      "status": "in_progress",
      "progress_percent": 50.0,
      "started_at": "2024-08-12T16:30:00",
      "completed_at": null,
      "scopes_completed": [],
      "notes": [],
      "last_event_id": "360bdf3e-0227-4054-b600-ca7da3e9ca8d"
    },
    {
      "milestone_id": "excavation_foundation",
      "name": "Excavation & Foundation",
      "status": "not_started",
      "progress_percent": 0.0,
      "started_at": null,
      "completed_at": null,
      "scopes_completed": [],
      "notes": [],
      "last_event_id": null
    }
  ],
  "unmapped_activities": [],
  "general_delay_events": 0,
  "events_pending_review": 0,
  "messages_not_understood": 1,
  "events_total": 5,
  "progress_note": "Progress counts only completed milestones and percentages explicitly reported in the chat; a milestone that merely started shows its configured start value (default 0).",
  "history": null
}
```
`history` is always present: `null` unless `include_history=true`, then an array. With history, one row looks like:
```json
{
  "id": 1,
  "project_id": "demo-site",
  "milestone_id": "brickwork",
  "event_id": "d670e3f9-1f5c-407b-8306-b047fd87cdc9",
  "changed_at": "2024-08-12T09:15:00",
  "old_status": "not_started",
  "new_status": "in_progress",
  "old_progress": 0.0,
  "new_progress": 0.0,
  "note": null
}
```
`overall_progress_percent` counts only completed milestones and percentages explicitly reported in chats (a milestone that merely started shows 0%). `events_pending_review` and `messages_not_understood` are good badge counts for a review screen.

Errors: `404 project_not_found`, `422 invalid_project_id`.

### 3.6 `POST /api/v1/projects/{project_id}/milestones/recompute`
**Changes derived data only.** No body. Rebuilds milestone state/history from all stored events (events are never modified). Normally unnecessary — every import already updates milestones.

Response **200** (`RecomputeResponse`, shortened):
```json
{
  "project_state": {
    "project_id": "demo-site",
    "overall_progress_percent": 4.55,
    "summary": {
      "total": 11,
      "completed": 0,
      "in_progress": 2,
      "delayed": 0,
      "not_started": 9
    },
    "milestones": [
      {
        "milestone_id": "brickwork",
        "name": "Brickwork",
        "status": "in_progress",
        "progress_percent": 0.0,
        "started_at": "2024-08-12T09:15:00",
        "completed_at": null,
        "scopes_completed": [],
        "notes": [],
        "last_event_id": "d670e3f9-1f5c-407b-8306-b047fd87cdc9"
      },
      {
        "milestone_id": "waterproofing",
        "name": "Waterproofing",
        "status": "in_progress",
        "progress_percent": 50.0,
        "started_at": "2024-08-12T16:30:00",
        "completed_at": null,
        "scopes_completed": [],
        "notes": [],
        "last_event_id": "360bdf3e-0227-4054-b600-ca7da3e9ca8d"
      },
      {
        "milestone_id": "excavation_foundation",
        "name": "Excavation & Foundation",
        "status": "not_started",
        "progress_percent": 0.0,
        "started_at": null,
        "completed_at": null,
        "scopes_completed": [],
        "notes": [],
        "last_event_id": null
      }
    ],
    "unmapped_activities": [],
    "general_delay_events": 0,
    "events_pending_review": 0,
    "messages_not_understood": 1,
    "events_total": 5,
    "progress_note": "Progress counts only completed milestones and percentages explicitly reported in the chat; a milestone that merely started shows its configured start value (default 0).",
    "history": null
  },
  "milestone_changes": []
}
```
`milestone_changes` is `[]` when nothing changed (the usual case).

Errors: `404 project_not_found`, `422 invalid_project_id`.

## 4. Error responses

**Application errors** — HTTP 404/413/422 with `{ "detail": { "code": string, "message": string } }` (switch on `code`):

| HTTP | `detail.code` | Endpoints | Meaning |
|---|---|---|---|
| 422 | `empty_input` | 2, 3 | blank text / blank file |
| 422 | `no_whatsapp_messages_found` | 2, 3 | text isn't a WhatsApp chat |
| 422 | `invalid_project_id` | 2–6 | id fails `^[A-Za-z0-9_-]{1,64}$` |
| 413 | `input_too_large` | 2 | text longer than the limit |
| 422 | `unsupported_file_type` | 3 | file name doesn't end in `.txt` |
| 413 | `file_too_large` | 3 | file larger than the limit |
| 422 | `invalid_encoding` | 3 | file isn't UTF-8 |
| 404 | `project_not_found` | 4–6 | no import has created this project yet |
| 404 | `no_events` | 4 | no `date` given and no dated events exist |

Real bodies:

`empty_input` →
```json
{
  "detail": {
    "code": "empty_input",
    "message": "The chat text is empty."
  }
}
```
`no_whatsapp_messages_found` →
```json
{
  "detail": {
    "code": "no_whatsapp_messages_found",
    "message": "No WhatsApp messages recognised. Expected lines like '12/08/24, 9:15 am - Ramesh: text' (Android) or '[12/08/2024, 9:15:03 AM] Ramesh: text' (iOS)."
  }
}
```
`project_not_found` →
```json
{
  "detail": {
    "code": "project_not_found",
    "message": "No project 'nope'. Import a chat first."
  }
}
```
`no_events` →
```json
{
  "detail": {
    "code": "no_events",
    "message": "This project has no dated events yet."
  }
}
```
**Request-validation errors** — HTTP 422 where `detail` is an **array** (missing field, wrong type, bad `date`, bad `format`):
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": [
        "body",
        "chat_text"
      ],
      "msg": "Field required",
      "input": {
        "project_id": "x"
      }
    }
  ]
}
```
```json
{
  "detail": [
    {
      "type": "date_from_datetime_parsing",
      "loc": [
        "query",
        "date"
      ],
      "msg": "Input should be a valid date or datetime, month value is outside expected range of 1-12",
      "input": "2024-13-45",
      "ctx": {
        "error": "month value is outside expected range of 1-12"
      }
    }
  ]
}
```
Handle both shapes: `Array.isArray(body.detail) ? body.detail.map(d => d.msg).join("; ") : body.detail.message`.

**Unexpected server error** — HTTP 500 with the plain text `Internal Server Error` (not JSON). Such a response carries **no CORS header**, so the browser reports it as a generic network/CORS failure; check the backend terminal.

## 5. Reference values

**Milestone status**: `not_started` · `in_progress` · `completed` · `delayed`.   **Default milestones** (ids are stable; names can change if `SITESYNC_MILESTONES_FILE` is used):

| order | `milestone_id` | name |
|---|---|---|
| 1 | `excavation_foundation` | Excavation & Foundation |
| 2 | `structure` | Structure (Shuttering, Slab, Concreting) |
| 3 | `brickwork` | Brickwork |
| 4 | `roofing` | Roofing |
| 5 | `plastering` | Plastering |
| 6 | `waterproofing` | Waterproofing |
| 7 | `electrical` | Electrical Wiring |
| 8 | `plumbing` | Plumbing |
| 9 | `flooring` | Flooring |
| 10 | `tiling` | Tiling |
| 11 | `painting` | Painting & Finishing |

**`ReviewItem.flags`** values: `ambiguous_date`, `date_unresolved`, `quantity_missing`, `worker_count_missing`, `activity_missing`, `inferred_verb`, `partial_capture`, `possible_duplicate`, `llm_extracted`, `not_understood`.

**`date_order`**: `dmy` (day first) or `mdy`; `date_order_ambiguous: true` means the chat's dates couldn't tell (day-first was assumed) — surface the matching entry in `warnings`.

## 6. Frontend setup

1. `.env.local` in the frontend folder: `VITE_API_BASE_URL=http://127.0.0.1:8000` — then **restart** `npm run dev` (Vite reads env at start). In code: `import.meta.env.VITE_API_BASE_URL`.
2. Use the Vite dev server origin that is printed in the terminal. Default `5173` is already allowed. If it is another port (Google AI Studio exports often use **3000**), add it on the backend and restart the backend:
   ```powershell
   $env:SITESYNC_CORS_ALLOW_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
   python -m uvicorn app.main:app --reload --reload-dir app --port 8000
   ```
   (or put `SITESYNC_CORS_ALLOW_ORIGINS=...` in the backend's `.env`). List **every** origin you use, exact `scheme://host:port`, no trailing slash, no `*`.
3. Start the backend **from the project folder** (the default SQLite file is `data/sitesync.db` *relative to where you start uvicorn*; starting elsewhere creates a new empty database). Or set an absolute `SITESYNC_DB_PATH`.
4. Minimal client:
```ts
const BASE = import.meta.env.VITE_API_BASE_URL;

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const b = await res.json(); msg = Array.isArray(b.detail) ? b.detail.map((d: any) => d.msg).join("; ") : (b.detail?.message ?? msg); } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const importChat = (project_id: string, chat_text: string) =>
  api<ImportResponse>("/api/v1/whatsapp/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id, chat_text }) });
export const getState = (id: string, history = false) => api<ProjectState>(`/api/v1/projects/${encodeURIComponent(id)}/state?include_history=${history}`);
export const getReport = (id: string, date?: string) => api<DailyReport>(`/api/v1/reports/daily?project_id=${encodeURIComponent(id)}${date ? `&date=${date}` : ""}`);
```
5. UI behaviour to expect: show a spinner during imports; after a successful import use `project_state` and `latest_report` from the response (no extra call needed); treat `404 project_not_found` as "no data yet"; display `warnings`; show `needs_review` / `messages_not_understood` as items for a supervisor to look at.

