#!/usr/bin/env node
// Emit a ready-to-paste prompt for whichever agent gets the baton next.
// Direction is inferred from .handoff/progress.json, or forced with --to.
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("usage: next_prompt.mjs <project-root> [--to codex|fable]");
  process.exit(2);
}

const argv = process.argv.slice(2);
let root = ".";
let forced = null;
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === "--to") {
    forced = argv[i + 1];
    i += 1;
  } else if (argv[i].startsWith("--")) {
    usage();
  } else {
    root = argv[i];
  }
}
if (forced && forced !== "codex" && forced !== "fable") usage();

root = path.resolve(root);
const handoffRoot = path.join(root, ".handoff");
const progressPath = path.join(handoffRoot, "progress.json");
if (!fs.existsSync(progressPath)) {
  console.error(`missing ${progressPath}. Run: fablodex init`);
  process.exit(1);
}

const progress = JSON.parse(fs.readFileSync(progressPath, "utf8"));
const taskId = progress.current_task_id ?? "";

let taskTitle = "";
try {
  const tasks = JSON.parse(fs.readFileSync(path.join(handoffRoot, "tasks.json"), "utf8"));
  const list = Array.isArray(tasks.tasks) ? tasks.tasks : [];
  const match = list.find((t) => t.id === taskId) ?? (tasks.id === taskId ? tasks : null);
  if (match && typeof match.title === "string") taskTitle = match.title;
} catch {
  // tasks.json missing or invalid; fall back to the id alone.
}

const taskLabel = taskTitle ? `"${taskId}" (${taskTitle})` : `"${taskId}"`;

function direction() {
  if (forced === "codex") return "to_codex";
  if (forced === "fable") return progress.phase === "blocked_by_fable" ? "blocked" : "done";
  if (progress.phase === "blocked_by_fable") return "blocked";
  if (progress.phase === "ready_for_codex" || progress.active_owner === "codex" || progress.active_owner === "lazycodex") {
    return "to_codex";
  }
  if (progress.phase === "verifying" || progress.phase === "complete") return "done";
  if (progress.active_owner === "claude_fable" && (progress.phase === "planning" || progress.phase === "research")) {
    return "plan";
  }
  return "done";
}

const prompts = {
  to_codex: `You are picking up a FabloDex handoff as Codex. Do this now, following the fablodex skill:

1. Read .handoff/progress.json, then .handoff/handoff.md, then task ${taskLabel} in .handoff/tasks.json.
2. Implement that task until it meets its acceptance_criteria. Use $ulw-loop to grind it to completion.
3. As you work, update .handoff/progress.json (phase, current_task_id, last_evidence) and the task's status in tasks.json, and save command output/screenshots/artifacts under .handoff/evidence/${taskId}/.
4. If you hit the SAME blocker twice, stop: record both attempts with evidence, set progress.phase to blocked_by_fable, fill .handoff/blocked-by-fable.md, and hand back to Fable.
5. Do not touch credentials, tokens, billing, deployments, or production unless the handoff explicitly approves it.

Start now.`,

  done: `Codex finished a FabloDex work chunk. Take over as Fable in Claude Code, following the fablodex skill:

1. Read .handoff/progress.json, then the evidence under .handoff/evidence/${taskId}/.
2. Verify the work meets task ${taskLabel}'s acceptance_criteria in .handoff/tasks.json.
3. If it passes: mark the task complete, then either plan the next chunk (update handoff.md + tasks.json, set progress.phase to ready_for_codex) or set progress.phase to complete if the whole plan is done.
4. If it fell short: REPLAN or SPLIT the task, then hand back to Codex.

Start now.`,

  blocked: `Codex escalated a FabloDex blocker to Fable. Take over in Claude Code, following the fablodex skill:

1. Read .handoff/blocked-by-fable.md and both evidence files for task ${taskLabel}.
2. Choose exactly one response: REPLAN, SPLIT, ESCALATED_FIX, or NEEDS_USER.
3. REPLAN or SPLIT: update handoff.md + tasks.json and set progress.phase to ready_for_codex. ESCALATED_FIX: fix in isolation (separate branch/worktree, scoped files) and write fable-fix-report.md. NEEDS_USER: ask the user, only for external/irreversible/destructive/product-defining decisions.

Start now.`,

  plan: `Start a FabloDex plan as Fable in Claude Code, following the fablodex skill:

1. Run /deep-interview to pin down intent, non-goals, and acceptance criteria; run /ultra-research for anything unknown and save findings under .handoff/evidence/research/.
2. Write the decision-complete plan into .handoff/handoff.md and one executable entry per task in .handoff/tasks.json — Codex must be able to run each task with no hidden context.
3. When ready, set progress.json to active_owner: codex, phase: ready_for_codex, and run: fablodex validate

Then run: fablodex prompt   (to get the paste-ready prompt for Codex)`,
};

const dir = direction();
const header = {
  to_codex: "→ Paste into Codex / LazyCodex:",
  done: "→ Paste into Claude Code (Fable):",
  blocked: "→ Paste into Claude Code (Fable) — blocker escalation:",
  plan: "→ Paste into Claude Code (Fable) — planning:",
}[dir];

console.error(header);
console.error("");
console.log(prompts[dir]);
