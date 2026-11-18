#!/usr/bin/env bash
# Merges upstream T3 Code into a new branch sync/upstream-<date>. Never pushes, never touches main.
# Usage: agentd/scripts/sync-upstream.sh [--dry-run] [--no-fetch] [--base REF]
#   --dry-run   report only; changes no branch, index or working tree
#   --no-fetch  use the upstream/main ref already present
#   --base REF  start the sync branch from REF (default HEAD)
set -euo pipefail

dry_run=0
fetch=1
base_ref=HEAD
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) dry_run=1 ;;
    --no-fetch) fetch=0 ;;
    --base) base_ref="${2:?--base needs a ref}"; shift ;;
    -h|--help) sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done

cd "$(git rev-parse --show-toplevel)"
upstream=upstream/main

if ! git remote get-url upstream >/dev/null 2>&1; then
  echo "error: no 'upstream' remote. Add it: git remote add upstream https://github.com/pingdotgg/t3code.git" >&2
  exit 1
fi

if [ "$fetch" = 1 ]; then
  # Updates only the remote-tracking ref upstream/main.
  if ! git fetch --quiet --no-tags upstream main; then
    echo "warning: fetching upstream failed; using the upstream/main ref already present" >&2
  fi
fi
git rev-parse --verify --quiet "$upstream" >/dev/null || { echo "error: no $upstream ref" >&2; exit 1; }

ours="$(git rev-parse "$base_ref")"
merge_base="$(git merge-base "$ours" "$upstream")"
behind="$(git rev-list --count "$ours..$upstream")"
ahead="$(git rev-list --count "$upstream..$ours")"

echo "Base:       $base_ref ($(git log -1 --format=%h "$ours"))"
echo "Upstream:   $upstream ($(git log -1 --format='%h %cs' "$upstream"))"
echo "Merge base: $(git log -1 --format='%h %s' "$merge_base")"
echo "Behind upstream by $behind commit(s); ahead by $ahead commit(s)."

both="$(comm -12 \
  <(git diff --name-only "$merge_base" "$ours" | sort) \
  <(git diff --name-only "$merge_base" "$upstream" | sort))"
echo
if [ -n "$both" ]; then
  echo "Files changed on both sides (check these after the merge):"
  printf '%s\n' "$both" | sed 's/^/  /'
else
  echo "No file changed on both sides."
fi

if [ "$dry_run" = 1 ]; then
  echo
  echo "Dry run: nothing changed."
  exit 0
fi

if [ "$behind" = 0 ]; then
  echo
  echo "Already up to date with upstream; nothing to merge."
  exit 0
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "error: the working tree has changes; commit or set them aside first" >&2
  exit 1
fi

branch="sync/upstream-$(date +%Y-%m-%d)"
if git rev-parse --verify --quiet "refs/heads/$branch" >/dev/null; then
  echo "error: branch $branch already exists" >&2
  exit 1
fi

echo
echo "Creating $branch from $base_ref and merging $upstream..."
git switch --quiet -c "$branch" "$ours"
if git merge --no-ff --no-edit -m "Merge upstream T3 Code ($(git log -1 --format=%h "$upstream")) into $branch" "$upstream"; then
  echo
  echo "Merged into $branch. Run the checks, then open a pull request against main yourself."
else
  echo
  echo "Merge stopped on conflicts in $branch:"
  git diff --name-only --diff-filter=U | sed 's/^/  /'
  echo "Resolve them as agentd/UPSTREAM.md describes, then: git add <files> && git commit"
  exit 1
fi
