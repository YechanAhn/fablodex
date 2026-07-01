#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const REQUIRED_FILES = [
  "README.md",
  "handoff.md",
  "tasks.json",
  "progress.json",
  "blocked-by-fable.md",
  "fable-fix-report.md",
  "evidence/.gitkeep",
  "schemas/tasks.schema.json",
  "schemas/progress.schema.json",
];

const REQUIRED_TASK_FIELDS = [
  "id",
  "title",
  "owner",
  "status",
  "instructions",
  "acceptance_criteria",
  "qa_commands",
  "evidence_required",
  "blocked_after_attempts",
];

const REQUIRED_PROGRESS_FIELDS = [
  "project",
  "active_owner",
  "phase",
  "current_task_id",
  "attempts_by_task",
  "last_evidence",
  "blocked_reason",
  "next_action",
];

const OWNER_VALUES = ["claude_fable", "codex", "lazycodex", "user"];
const PHASE_VALUES = [
  "planning",
  "research",
  "ready_for_codex",
  "implementing",
  "verifying",
  "blocked_by_fable",
  "escalated_fix",
  "complete",
];
const TASK_STATUSES = [
  "pending",
  "ready",
  "in_progress",
  "blocked",
  "blocked_by_fable",
  "complete",
  "cancelled",
  "split",
  "replanned",
];
const FABLE_MODES = ["REPLAN", "SPLIT", "ESCALATED_FIX", "NEEDS_USER"];

const root = path.resolve(process.argv[2] || ".");
const handoffRoot = path.join(root, ".handoff");
const errors = [];

function addError(message) {
  errors.push(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(handoffRoot, relativePath), "utf8");
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    addError(`${relativePath}: invalid JSON: ${error.message}`);
    return undefined;
  }
}

function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0 && !/[<>\[\]]/.test(value);
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.some((item) => hasNonEmptyString(String(item)));
}

function requireFields(container, fields, label) {
  if (!container || typeof container !== "object") {
    addError(`${label}: missing object`);
    return;
  }
  for (const field of fields) {
    if (!(field in container)) addError(`${label}: missing ${field}`);
  }
}

function requireSchemaFields(schema, requiredFields, label) {
  if (!schema || !Array.isArray(schema.required)) {
    addError(`${label}: missing required array`);
    return;
  }
  for (const field of requiredFields) {
    if (!schema.required.includes(field)) addError(`${label}: required does not include ${field}`);
  }
}

function requireEnum(schema, property, values, label) {
  const enumValues = schema?.properties?.[property]?.enum;
  if (!Array.isArray(enumValues)) {
    addError(`${label}: ${property} enum missing`);
    return;
  }
  for (const value of values) {
    if (!enumValues.includes(value)) addError(`${label}: ${property} enum missing ${value}`);
  }
}

function validateTask(task, label) {
  requireFields(task, REQUIRED_TASK_FIELDS, label);
  if (!hasNonEmptyString(task.id)) addError(`${label}: id must be filled`);
  if (!hasNonEmptyString(task.title)) addError(`${label}: title must be filled`);
  if (!OWNER_VALUES.includes(task.owner)) addError(`${label}: invalid owner ${task.owner}`);
  if (!TASK_STATUSES.includes(task.status)) addError(`${label}: invalid status ${task.status}`);
  if (!hasNonEmptyString(task.instructions)) addError(`${label}: instructions must be filled`);
  if (!hasNonEmptyArray(task.acceptance_criteria)) addError(`${label}: acceptance_criteria must be nonempty`);
  if (!hasNonEmptyArray(task.qa_commands)) addError(`${label}: qa_commands must be nonempty`);
  if (!hasNonEmptyArray(task.evidence_required)) addError(`${label}: evidence_required must be nonempty`);
  if (task.blocked_after_attempts !== 2) addError(`${label}: blocked_after_attempts must be 2`);
}

function evidenceExists(evidencePath) {
  if (!hasNonEmptyString(evidencePath)) return false;
  const resolved = path.resolve(root, evidencePath);
  return fs.existsSync(resolved);
}

function requireLine(text, pattern, label) {
  if (!pattern.test(text)) addError(`${label}: missing or unfilled`);
}

function selectedMode(text) {
  const match = text.match(/^Selected response:[ \t]*(REPLAN|SPLIT|ESCALATED_FIX|NEEDS_USER)[ \t]*$/m);
  return match?.[1];
}

function validateBlocked(progress, blockedText) {
  if (!hasNonEmptyString(progress.current_task_id)) {
    addError("blocked_by_fable: current_task_id required");
  }
  const attempts = progress.attempts_by_task?.[progress.current_task_id];
  if (!Array.isArray(attempts) || attempts.length < 2) {
    addError("blocked_by_fable requires two attempts");
  } else {
    for (const attempt of attempts.slice(0, 2)) {
      if (!hasNonEmptyString(attempt.summary)) addError("blocked_by_fable: attempt summary required");
      if (!evidenceExists(attempt.evidence)) addError(`blocked_by_fable: evidence missing ${attempt.evidence}`);
    }
  }

  requireLine(blockedText, /^Task ID:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "blocked-by-fable Task ID");
  requireLine(blockedText, /^Exact blocker:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "blocked-by-fable Exact blocker");
  requireLine(blockedText, /^Attempt 1 summary:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "blocked-by-fable Attempt 1 summary");
  requireLine(blockedText, /^Attempt 1 evidence:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "blocked-by-fable Attempt 1 evidence");
  requireLine(blockedText, /^Attempt 2 summary:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "blocked-by-fable Attempt 2 summary");
  requireLine(blockedText, /^Attempt 2 evidence:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "blocked-by-fable Attempt 2 evidence");
  requireLine(blockedText, /^Suspected cause:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "blocked-by-fable Suspected cause");
  requireLine(blockedText, /^Decision needed from Fable:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "blocked-by-fable Decision needed from Fable");
}

function validateSelectedMode(mode, blockedText, progress) {
  if (!mode) return;
  if (mode === "REPLAN") {
    requireLine(blockedText, /^REPLAN result:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "REPLAN result");
    requireLine(blockedText, /^Updated files:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "REPLAN updated files");
  }
  if (mode === "SPLIT") {
    requireLine(blockedText, /^SPLIT result:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "SPLIT result");
    requireLine(blockedText, /^Replacement tasks:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "SPLIT replacement tasks");
  }
  if (mode === "NEEDS_USER") {
    requireLine(blockedText, /^NEEDS_USER question:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "NEEDS_USER question");
    requireLine(blockedText, /^Why user decision is required:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "NEEDS_USER reason");
  }
  if (mode === "ESCALATED_FIX" && progress.phase !== "escalated_fix") {
    addError("ESCALATED_FIX selected but progress.phase is not escalated_fix");
  }
}

function validateEscalatedFix(progress, fixText, blockedText) {
  const active = progress.phase === "escalated_fix" || /^Selected response:[ \t]*ESCALATED_FIX[ \t]*$/m.test(blockedText);
  if (!active) return;
  requireLine(fixText, /^Mode:[ \t]*ESCALATED_FIX[ \t]*$/m, "fable-fix-report mode");
  requireLine(fixText, /^Why direct fix was chosen:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "fable-fix-report why");
  requireLine(fixText, /^Branch or worktree:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "fable-fix-report branch/worktree");
  requireLine(fixText, /^Changed files:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "fable-fix-report changed files");
  requireLine(fixText, /^Commands run:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "fable-fix-report commands");
  requireLine(fixText, /^Evidence paths:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "fable-fix-report evidence");
  requireLine(fixText, /^Remaining risks:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "fable-fix-report risks");
  requireLine(fixText, /^Codex resume instruction:[ \t]*(?!TBD|TODO|<pending>|$)\S.*/m, "fable-fix-report resume");
}

if (!fs.existsSync(handoffRoot)) {
  console.log("missing .handoff");
  process.exit(1);
}

for (const relativePath of REQUIRED_FILES) {
  if (!fs.existsSync(path.join(handoffRoot, relativePath))) {
    addError(`missing .handoff/${relativePath}`);
  }
}

const tasksDoc = readJson("tasks.json");
const progress = readJson("progress.json");
const tasksSchema = readJson("schemas/tasks.schema.json");
const progressSchema = readJson("schemas/progress.schema.json");
const blockedText = fs.existsSync(path.join(handoffRoot, "blocked-by-fable.md"))
  ? readText("blocked-by-fable.md")
  : "";
const fixText = fs.existsSync(path.join(handoffRoot, "fable-fix-report.md"))
  ? readText("fable-fix-report.md")
  : "";

requireSchemaFields(tasksSchema, REQUIRED_TASK_FIELDS, "tasks.schema.json");
requireSchemaFields(progressSchema, REQUIRED_PROGRESS_FIELDS, "progress.schema.json");
requireEnum(progressSchema, "active_owner", OWNER_VALUES, "progress.schema.json");
requireEnum(progressSchema, "phase", PHASE_VALUES, "progress.schema.json");

if (tasksDoc) {
  validateTask(tasksDoc, "tasks.json root task");
  if (!Array.isArray(tasksDoc.tasks) || tasksDoc.tasks.length === 0) {
    addError("tasks.json: tasks array must be nonempty");
  } else {
    tasksDoc.tasks.forEach((task, index) => validateTask(task, `tasks.json tasks[${index}]`));
  }
}

if (progress) {
  requireFields(progress, REQUIRED_PROGRESS_FIELDS, "progress.json");
  if (!OWNER_VALUES.includes(progress.active_owner)) addError(`progress.json: invalid active_owner ${progress.active_owner}`);
  if (!PHASE_VALUES.includes(progress.phase)) addError(`progress.json: invalid phase ${progress.phase}`);
  if (!progress.attempts_by_task || typeof progress.attempts_by_task !== "object" || Array.isArray(progress.attempts_by_task)) {
    addError("progress.json: attempts_by_task must be an object");
  }
  if (!Array.isArray(progress.last_evidence)) addError("progress.json: last_evidence must be an array");
  if (progress.phase === "blocked_by_fable") validateBlocked(progress, blockedText);
  const mode = selectedMode(blockedText);
  validateSelectedMode(mode, blockedText, progress);
  validateEscalatedFix(progress, fixText, blockedText);
}

for (const mode of FABLE_MODES) {
  if (!blockedText.includes(mode)) addError(`blocked-by-fable.md: missing ${mode}`);
}

if (errors.length > 0) {
  console.error("handoff validation failed");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("handoff validation passed");
