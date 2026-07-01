# Claude/Fable Bridge Notes

## `/deep-interview`

When a deep interview completes, write the clarified result into `.handoff/`:

- Put intent, non-goals, decision boundaries, and acceptance criteria in `handoff.md`.
- Convert executable work into `tasks.json`.
- Set `progress.active_owner` to `codex` and `progress.phase` to `ready_for_codex` only when the task contract is complete enough for Codex to execute without hidden context.
- Leave unresolved external decisions as user-owned tasks, not Codex assumptions.

## `/ultra-research`

When ultra-research completes:

- Put findings, citations, uncertainty, and recommendation summaries under `.handoff/evidence/research/`.
- Update `handoff.md` with the decision-relevant synthesis, not raw research dumps.
- Update `tasks.json` only when research changes acceptance criteria, task order, or evidence requirements.
- Keep credentials, billing, deployments, and production side effects outside default task scope.

## Replanning After Codex Blocks

Read `blocked-by-fable.md` and the two evidence files before deciding. Choose one response:

- `REPLAN`: revise plan/task contract.
- `SPLIT`: make the task smaller.
- `ESCALATED_FIX`: fix directly with isolation and `fable-fix-report.md`.
- `NEEDS_USER`: ask the user for a decision Fable and Codex should not make.
