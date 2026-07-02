---
name: fablodex
description: FabloDex initializes, validates, resumes, and escalates a project-local `.handoff/` contract shared by Claude Code/Fable 5, Codex App, and LazyCodex. Use when setting up Fable-to-Codex handoffs, reading handoff state at session start, validating progress, recording a two-attempt Codex blocker, or handling Fable `ESCALATED_FIX` reports.
---

# FabloDex

Use this skill to create or work from a shared `.handoff/` folder. The folder is the contract between Claude Code/Fable 5 planning, Codex App implementation, and LazyCodex-assisted artifacts.

## Modes

- **init**: run `node <this-skill>/scripts/init_handoff.mjs <project-root> --project-name <name>`.
- **status/resume**: read `<project-root>/.handoff/progress.json`, then `<project-root>/.handoff/handoff.md`, then the active task in `tasks.json`.
- **validate**: run `node <this-skill>/scripts/validate_handoff.mjs <project-root>`.
- **prompt**: run `node <this-skill>/scripts/next_prompt.mjs <project-root> [--to codex|fable]` to emit a paste-ready handoff prompt for the next agent, inferred from `progress.json`. Use after a plan, a finished chunk, or a blocker.
- **blocked**: Codex records two failed attempts with evidence in `blocked-by-fable.md` before asking Fable to replan, split, directly fix, or ask the user.
- **escalated-fix**: Fable may edit code only after choosing `ESCALATED_FIX`; it must update `progress.json` and write `fable-fix-report.md`.

## Rules

- Treat `handoff.md` and planning/research fields in `tasks.json` as Fable-owned in normal mode.
- Treat `progress.json`, task status fields, and `.handoff/evidence/` as Codex-owned during implementation.
- Do not use `ESCALATED_FIX` as normal operation. It requires two Codex attempts, evidence, and a written report.
- Do not touch credentials, login databases, tokens, billing, deployments, or production accounts unless the project handoff explicitly asks and the user has approved the external side effect.
- Keep LazyCodex optional: it can own tasks or evidence lanes, but initialization and validation must work without it.

## References

- Read `references/contract.md` when deciding ownership, blocker handling, or direct-fix boundaries.
- Read `references/claude-bridges.md` when bridging `/deep-interview` or `/ultra-research` output into `.handoff/`.

## Quick Commands

```bash
fablodex init
fablodex validate
fablodex prompt
```
