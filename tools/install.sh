#!/bin/sh
# Safe to re-run. It replaces an existing symlink at the target and never touches a real directory.
set -eu

repo=$(cd "$(dirname "$0")/.." && pwd)
roots="${KSTACK_SKILL_ROOTS:-$HOME/.agents/skills $HOME/.claude/skills $HOME/.codex/skills $HOME/.omp/agent/skills $HOME/.cursor/skills}"
status=0

for skill in "$repo"/skills/*/; do
  skill=${skill%/}
  name=$(basename "$skill")
  [ -f "$skill/SKILL.md" ] || continue
  for root in $roots; do
    mkdir -p "$root"
    dest="$root/$name"
    if [ -e "$dest" ] && [ ! -L "$dest" ]; then
      echo "skip   $dest (exists and is not a symlink; move it away first)" >&2
      status=1
      continue
    fi
    ln -sfn "$skill" "$dest"
    echo "linked $dest -> $skill"
  done
done
exit $status
