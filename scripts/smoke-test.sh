#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmpdir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT

node "$repo_root/skills/fablodex/scripts/validate_handoff.mjs" "$tmpdir" > "$tmpdir/red.out" 2>&1 && {
  echo "expected validation to fail before init" >&2
  exit 1
}
grep -qx "missing .handoff" "$tmpdir/red.out"

"$repo_root/bin/fablodex" init "$tmpdir" --project-name SmokeTest > "$tmpdir/init.out"
"$repo_root/bin/fablodex" validate "$tmpdir" > "$tmpdir/green.out"
"$repo_root/bin/fablodex" status "$tmpdir" > "$tmpdir/status.out"

grep -q "handoff validation passed" "$tmpdir/green.out"
grep -q "project: SmokeTest" "$tmpdir/status.out"

echo "PASS"
