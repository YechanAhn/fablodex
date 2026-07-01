# .handoff

This directory is the shared contract between Claude Code/Fable 5, Codex App, LazyCodex lanes, and the user.

Start every new session by reading:

1. `progress.json`
2. `handoff.md`
3. the active task in `tasks.json`

Normal ownership:

- Claude/Fable: planning, interview, research, replanning, and `blocked-by-fable.md` response sections.
- Codex: implementation, tests, QA, `progress.json`, task status fields, and evidence.
- LazyCodex: optional artifact or QA lanes recorded as owner/evidence.
- User: external, irreversible, destructive, or account-affecting decisions.

Codex escalates only after two failed attempts on the same blocker with evidence.
