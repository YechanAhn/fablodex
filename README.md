# FabloDex

**Fable thinks. Codex builds. FabloDex keeps the handoff intact.**

FabloDex is a tiny project-local `.handoff/` protocol that lets **Fable 5 (in Claude Code)** do the planning and **Codex / LazyCodex** do the building — without losing context, progress, evidence, or escalation state when work moves between them.

## Why

Fable 5 is exceptional at planning, research, and replanning, but for a coding session you often want a cheaper, tireless executor to grind through the plan. The efficient pattern (inspired by [@yeon.gyu.kim](https://www.threads.com/@yeon.gyu.kim)'s LazyCodex workflow) is:

1. **Fable plans.** Use Claude Code (ultracode / dynamic-workflow research on Opus) to interview, research, and write a decision-complete plan.
2. **Codex/LazyCodex builds.** Hand the plan to Codex and let `$ulw-loop` grind it to completion.
3. **Loop for the week.** Re-plan the next chunk, hand off again, repeat.

The missing piece is a **durable contract** so the executor never loses the plan's intent and the planner never loses the executor's progress. That contract is `.handoff/`.

FabloDex is built for workflows where:

- Fable 5 does deep interview, ultra-research, planning, and replanning.
- Codex App implements, tests, verifies, and produces artifacts.
- LazyCodex can grind a plan to completion (`$ulw-loop`) or own an output/QA lane.
- Codex escalates only after two failed attempts on the same blocker.
- Fable then chooses `REPLAN`, `SPLIT`, `ESCALATED_FIX`, or `NEEDS_USER`.

## Install

```bash
git clone https://github.com/YechanAhn/fablodex.git
cd fablodex
./install.sh
```

`install.sh` requires `node` and installs the skill to **both** agents plus the CLI:

| Path | Used by |
| --- | --- |
| `~/.codex/skills/fablodex` | Codex App (canonical copy) |
| `~/.claude/skills/fablodex` → symlink to the Codex copy | Claude Code / Fable |
| `~/.local/bin/fablodex*` | CLI (`init` / `validate` / `status`) |

The symlink means Claude Code and Codex share one skill copy, so they never drift apart. Make sure `~/.local/bin` is on your `PATH`.

## Full Flow (end to end)

This is the complete loop. Each step names **who acts** and **what changes in `.handoff/`**.

### 0. Initialize once (any agent)

From your project root:

```bash
fablodex init
```

Creates `.handoff/` with `progress.json` at `active_owner: claude_fable`, `phase: planning`, and a placeholder starter task. **This is not yet Codex's turn** — the starter task is a stub for Fable to replace.

### 1. Fable plans (Claude Code / Fable 5)

In Claude Code, run your planning flow (e.g. `/deep-interview`, `/ultra-research`, ultracode dynamic-workflow research). Then write the results into `.handoff/`:

- Intent, non-goals, decision boundaries, acceptance criteria → `handoff.md`
- Executable work, one entry per task → `tasks.json`
- Research findings/citations → `.handoff/evidence/research/`
- When the plan is decision-complete, set `progress.json` to `active_owner: codex`, `phase: ready_for_codex`.

"Decision-complete" means Codex can execute **without hidden context**. Leave unresolved external decisions (credentials, billing, deploys) as user-owned tasks, not Codex assumptions.

Validate before handing off:

```bash
fablodex validate    # must print "handoff validation passed"
```

### 2. Codex builds (Codex App / LazyCodex)

Open the **same project folder** in Codex App. Codex starts every session by reading, in order:

1. `.handoff/progress.json` — whose turn, which phase, which task
2. `.handoff/handoff.md` — what to build and why
3. the active task (`progress.current_task_id`) in `.handoff/tasks.json`

Then Codex implements. With LazyCodex you can hand the whole plan off with a single `$ulw-loop` prompt and let it grind. As it works, Codex updates:

- `progress.json` (`phase: implementing` → `verifying`, `current_task_id`, `last_evidence`)
- each task's `status` in `tasks.json`
- artifacts, logs, screenshots under `.handoff/evidence/<task-id>/`

### 3. Codex escalates only after two real attempts

If Codex hits the **same** blocker twice, it does not keep flailing. It:

1. records both attempts (each with a summary + an evidence path) in `progress.attempts_by_task`,
2. sets `progress.phase: blocked_by_fable`,
3. fills `.handoff/blocked-by-fable.md`.

### 4. Fable responds (Claude Code / Fable 5)

Fable reads `blocked-by-fable.md` and both evidence files, then picks **exactly one**:

- `REPLAN` — revise `handoff.md` and `tasks.json`.
- `SPLIT` — replace the blocked task with smaller executable tasks.
- `ESCALATED_FIX` — fix directly in isolation (separate branch/worktree, scoped files only), then write `fable-fix-report.md`. Not normal operation.
- `NEEDS_USER` — ask the user, only for external / irreversible / destructive / product-defining decisions.

Control returns to Codex, and the loop continues until the plan is complete.

### 5. Loop for the week

Re-plan the next chunk with Fable, hand off, let Codex/LazyCodex grind. Repeat. Fewer prompts, lower cost, and the executor runs while you plan the next step.

```text
Fable plan → handoff → Codex build → (blocked?) → Fable decide → repeat
```

## The `.handoff/` Directory

```text
.handoff/
  README.md              # in-repo orientation for any agent opening the folder
  handoff.md             # Fable-owned: intent, non-goals, boundaries, acceptance criteria
  tasks.json             # executable task contract (validated against schema)
  progress.json          # single source of truth for owner/phase/current task
  blocked-by-fable.md    # Codex fills on escalation; Fable writes its decision
  fable-fix-report.md    # written only for ESCALATED_FIX
  evidence/              # command output, screenshots, reports, artifacts
  schemas/
    tasks.schema.json
    progress.schema.json
```

## State Model (for humans and agents)

`progress.json` is the single source of truth. Two fields drive everything:

- **`active_owner`**: `claude_fable` · `codex` · `lazycodex` · `user`
- **`phase`**: `planning` → `research` → `ready_for_codex` → `implementing` → `verifying` → (`blocked_by_fable` → `escalated_fix`) → `complete`

Ownership in normal operation:

| Surface | Owns |
| --- | --- |
| Claude Code / Fable 5 | interview, research, planning, task wording, acceptance criteria, post-blocker decisions |
| Codex App | implementation, tests, QA, `progress.json`, task `status`, evidence |
| LazyCodex | optional artifact / QA lanes (init and validate must work without it) |
| User | irreversible/external decisions: credentials, billing, deploys, account/production changes |

## Escalation Rule

Codex escalates **only** when all three hold:

1. The same blocker was attempted twice.
2. Both attempts have evidence under `.handoff/evidence/`.
3. `.handoff/blocked-by-fable.md` is filled.

This keeps the planner's attention for genuine blockers, not routine friction.

## For AI agents reading this repo

If you are an agent picking up work in a project that has `.handoff/`:

1. Read `.handoff/progress.json` first. Act only if `active_owner` matches your role.
2. Read `.handoff/handoff.md`, then the task at `progress.current_task_id` in `tasks.json`.
3. Do not edit Fable-owned files (`handoff.md`, planning fields in `tasks.json`) while implementing; do not edit Codex-owned files (`progress.json`, task `status`, `evidence/`) while planning.
4. Never touch credentials, tokens, login databases, billing, deployments, or production accounts unless the handoff explicitly asks and the user approved it.
5. When blocked, follow the two-attempt escalation rule above instead of guessing.

The full contract lives in `skills/fablodex/references/contract.md`; bridge notes for `/deep-interview` and `/ultra-research` live in `skills/fablodex/references/claude-bridges.md`.

## CLI

```bash
fablodex init [project-root] [--project-name <name>]
fablodex validate [project-root]
fablodex status [project-root]
fablodex install
```

Aliases: `fablodex-init`, `fablodex-validate`, `fablodex-status`.

## Development

```bash
npm run check    # node --check on the handoff scripts
npm run smoke    # end-to-end init → validate → status smoke test
```

## Credits

The 7-day Fable-plans / LazyCodex-builds loop that this protocol codifies was inspired by [@yeon.gyu.kim](https://www.threads.com/@yeon.gyu.kim) and [LazyCodex](https://lazycodex.ai).

## License

MIT
