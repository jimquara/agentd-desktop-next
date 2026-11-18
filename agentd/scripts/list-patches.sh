#!/usr/bin/env bash
# Lists every upstream file this fork has changed since the fork point, with line counts.
# Usage: agentd/scripts/list-patches.sh [REF]   (REF defaults to HEAD)
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
ref="${1:-HEAD}"
fork_point_fallback=f5f8c8d18baf6a194fea9c7a3734158c2b7ea57b

if git rev-parse --verify --quiet upstream/main >/dev/null; then
  base="$(git merge-base "$ref" upstream/main)"
else
  echo "note: no upstream/main ref; using the original fork point" >&2
  base="$fork_point_fallback"
fi

echo "Fork point: $(git log -1 --format='%h %s' "$base")"
echo
echo "Upstream files changed (added/removed lines):"

# Only files that existed upstream: our own new files (A) are not patches.
git diff --numstat --diff-filter=MDRT -M "$base" "$ref" | awk -F'\t' '
  { add = ($1 == "-") ? 0 : $1; del = ($2 == "-") ? 0 : $2
    printf "  +%-6s -%-6s %s\n", $1, $2, $3; files++; ta += add; td += del }
  END { printf "\n%d upstream file(s) changed, +%d -%d lines\n", files, ta, td }'

added="$(git diff --name-only --diff-filter=A "$base" "$ref" | wc -l | tr -d ' ')"
echo "$added file(s) added by this fork (not counted as patches)"
