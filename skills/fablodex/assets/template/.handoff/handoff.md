# Handoff: {{PROJECT_NAME}}

Created: {{CREATED_AT}}

## Intent

Describe the user-visible outcome in one paragraph.

## Non-Goals

- Do not touch credentials, login state, token files, billing, deployments, production data, or external accounts unless explicitly approved in this project handoff.

## Decision Boundaries

- Claude/Fable decides planning, research synthesis, acceptance criteria, replanning, task splits, and whether escalation requires `ESCALATED_FIX` or `NEEDS_USER`.
- Codex decides normal implementation details, test shape, and equivalent QA commands inside the approved task boundary.
- LazyCodex can own output or QA lanes when useful, but it is optional.
- User decides irreversible, destructive, external, or materially product-defining choices.

## Codex Session Start

Read `.handoff/progress.json`, then this file, then the active task in `.handoff/tasks.json`. Continue from `progress.current_task_id` and record evidence under `.handoff/evidence/`.

## Acceptance Criteria

- Replace this section with project-specific criteria before Codex implementation begins.

## Evidence Conventions

- Store command output, screenshots, reports, and generated artifacts under `.handoff/evidence/`.
- Use relative paths from the project root in `progress.json` and task evidence fields.
