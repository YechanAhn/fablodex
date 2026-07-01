# Cross-Surface Handoff Contract

## Ownership

- Claude Code/Fable 5 owns clarification, research, planning, task wording, acceptance criteria, and post-blocker decisions.
- Codex App owns normal implementation, tests, QA, progress updates, and evidence capture.
- LazyCodex can own artifact generation or QA lanes when useful, but the handoff package must work without LazyCodex installed.
- The user owns irreversible or external decisions: credentials, billing, deployments, account changes, production data, and materially product-defining choices.

## Normal Flow

1. Initialize `.handoff/` once in the project.
2. Fable writes `handoff.md` and executable tasks in `tasks.json`.
3. Codex starts or resumes by reading `progress.json`, `handoff.md`, then the active task in `tasks.json`.
4. Codex updates `progress.json`, task status fields, and `.handoff/evidence/`.
5. Validation must pass before a handoff is treated as ready.

## Blocker Rule

Codex escalates only after two failed attempts on the same blocker. Each attempt must have a summary and an evidence path under `.handoff/evidence/`. Then Codex sets `progress.phase` to `blocked_by_fable` and fills `blocked-by-fable.md`.

Fable response choices:

- `REPLAN`: update `handoff.md` and `tasks.json`.
- `SPLIT`: replace the blocked task with smaller executable tasks.
- `ESCALATED_FIX`: directly fix in isolation when replanning is insufficient.
- `NEEDS_USER`: ask the user only for external, irreversible, destructive, or materially product-defining decisions.

## Escalated Fix

`ESCALATED_FIX` is not normal operation. Fable must set `progress.phase` to `escalated_fix`, prefer a separate branch or worktree, touch only the scoped files, run verification, and write `fable-fix-report.md` with why it fixed directly, changed files, commands, evidence, risks, and exact Codex resume instructions.

## Safety Boundaries

The default handoff package must not modify credentials, token files, login databases, billing settings, deployment settings, or production accounts. A project-specific handoff can ask for external side effects only when the user has explicitly approved them.
