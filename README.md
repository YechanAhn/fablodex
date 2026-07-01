# FabloDex

**Fable thinks. Codex builds. FabloDex keeps the handoff intact.**

FabloDex is a tiny `.handoff/` protocol for passing work from Claude Code running Fable 5 to Codex App without losing context, progress, evidence, or escalation state.

It is built for workflows where:

- Fable 5 does deep interview, ultra-research, planning, and replanning.
- Codex App implements, tests, verifies, and produces artifacts.
- LazyCodex can help with output or QA lanes when useful.
- Codex escalates only after two failed attempts on the same blocker.
- Fable can then `REPLAN`, `SPLIT`, choose `ESCALATED_FIX`, or mark `NEEDS_USER`.

## Install

```bash
git clone https://github.com/YechanAhn/fablodex.git
cd fablodex
./install.sh
```

Make sure `~/.local/bin` is on your `PATH`.

## Quick Start

From any project root:

```bash
fablodex init
fablodex validate
fablodex status
```

This creates:

```text
.handoff/
  README.md
  handoff.md
  tasks.json
  progress.json
  blocked-by-fable.md
  fable-fix-report.md
  evidence/
  schemas/
    tasks.schema.json
    progress.schema.json
```

## How It Works

FabloDex uses a project-local `.handoff/` directory as the shared contract.

Normal ownership:

- **Claude Code/Fable 5** owns interview, research, planning, task contracts, and post-blocker decisions.
- **Codex App** owns implementation, tests, QA, progress updates, and evidence.
- **LazyCodex** can own optional artifact or QA lanes.
- **User** owns irreversible, external, destructive, billing, credential, deployment, and production decisions.

Every new agent session starts by reading:

1. `.handoff/progress.json`
2. `.handoff/handoff.md`
3. the active task in `.handoff/tasks.json`

## Escalation Rule

Codex escalates only when:

1. The same blocker was attempted twice.
2. Both attempts have evidence under `.handoff/evidence/`.
3. `.handoff/blocked-by-fable.md` is filled.

Fable then chooses exactly one response:

- `REPLAN`: update `handoff.md` and `tasks.json`.
- `SPLIT`: replace the blocked task with smaller executable tasks.
- `ESCALATED_FIX`: directly fix in isolation and write `fable-fix-report.md`.
- `NEEDS_USER`: ask the user only when the decision is external, irreversible, destructive, or product-defining.

## CLI

```bash
fablodex init [project-root] [--project-name <name>]
fablodex validate [project-root]
fablodex status [project-root]
fablodex install
```

Aliases:

```bash
fablodex-init
fablodex-validate
fablodex-status
```

## Skill Locations

`install.sh` installs one canonical skill and one symlink:

```text
~/.codex/skills/fablodex
~/.claude/skills/fablodex -> ~/.codex/skills/fablodex
```

This prevents Claude Code and Codex from drifting into separate template copies.

## Development

Run checks:

```bash
node --check skills/fablodex/scripts/init_handoff.mjs
node --check skills/fablodex/scripts/validate_handoff.mjs
./scripts/smoke-test.sh
```

## License

MIT
