#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_src="$repo_root/skills/fablodex"
codex_dest="${CODEX_HOME:-$HOME/.codex}/skills/fablodex"
claude_dest="$HOME/.claude/skills/fablodex"
bin_dest="$HOME/.local/bin"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"

backup_path() {
  local target="$1"
  if [[ -e "$target" || -L "$target" ]]; then
    local backup="$target.backup.$stamp"
    mv "$target" "$backup"
    echo "backup=$backup"
  fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "node is required" >&2
  exit 1
fi

mkdir -p "$(dirname "$codex_dest")" "$HOME/.claude/skills" "$bin_dest"
backup_path "$codex_dest"
cp -R "$skill_src" "$codex_dest"

backup_path "$claude_dest"
ln -s "$codex_dest" "$claude_dest"

for bin in fablodex fablodex-init fablodex-validate fablodex-status; do
  cp "$repo_root/bin/$bin" "$bin_dest/$bin"
  chmod +x "$bin_dest/$bin"
done

echo "installed FabloDex"
echo "codex_skill=$codex_dest"
echo "claude_skill=$claude_dest"
echo "bin_dir=$bin_dest"
echo "next: ensure $bin_dest is on PATH, then run: fablodex init"
