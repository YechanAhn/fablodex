#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const skillRoot = path.resolve(path.dirname(scriptPath), "..");
const templateRoot = path.join(skillRoot, "assets", "template", ".handoff");

function usage() {
  console.error("usage: init_handoff.mjs <project-root> --project-name <name>");
  process.exit(2);
}

function parseArgs(argv) {
  const root = argv[2];
  if (!root) usage();
  let projectName = path.basename(path.resolve(root));
  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === "--project-name") {
      projectName = argv[i + 1];
      i += 1;
    } else {
      usage();
    }
  }
  if (!projectName) usage();
  return { root: path.resolve(root), projectName };
}

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

function readExistingCreatedAt(handoffRoot) {
  const progressPath = path.join(handoffRoot, "progress.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(progressPath, "utf8"));
    if (typeof parsed.created_at === "string" && parsed.created_at.length > 0) {
      return parsed.created_at;
    }
  } catch {
    // First initialization or user-edited invalid JSON; use a fresh timestamp.
  }
  return new Date().toISOString();
}

function render(content, values) {
  return content
    .replaceAll("{{PROJECT_NAME}}", values.projectName)
    .replaceAll("{{CREATED_AT}}", values.createdAt);
}

function backupExisting(target, handoffRoot, relativePath, stamp) {
  const backupPath = path.join(handoffRoot, ".init-backups", stamp, relativePath);
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(target, backupPath);
  return backupPath;
}

const { root, projectName } = parseArgs(process.argv);
if (!fs.existsSync(templateRoot)) {
  console.error(`missing template root: ${templateRoot}`);
  process.exit(1);
}

const handoffRoot = path.join(root, ".handoff");
fs.mkdirSync(handoffRoot, { recursive: true });
const createdAt = readExistingCreatedAt(handoffRoot);
const stamp = new Date().toISOString().replaceAll(":", "").replaceAll(".", "");

let created = 0;
let unchanged = 0;
let conflicts = 0;
const backups = [];

for (const source of listFiles(templateRoot)) {
  const relativePath = path.relative(templateRoot, source);
  const target = path.join(handoffRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const sourceContent = fs.readFileSync(source, "utf8");
  const rendered = render(sourceContent, { projectName, createdAt });

  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, rendered);
    created += 1;
    continue;
  }

  const current = fs.readFileSync(target, "utf8");
  if (current === rendered) {
    unchanged += 1;
    continue;
  }

  backups.push(backupExisting(target, handoffRoot, relativePath, stamp));
  conflicts += 1;
}

console.log(`initialized .handoff at ${handoffRoot}`);
console.log(`created=${created} unchanged=${unchanged} conflicts_preserved=${conflicts}`);
for (const backup of backups) {
  console.log(`backup=${backup}`);
}
