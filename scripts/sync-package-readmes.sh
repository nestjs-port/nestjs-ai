#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
source_readme="$repo_root/README.md"

if [[ ! -f "$source_readme" ]]; then
  echo "source README not found: $source_readme" >&2
  exit 1
fi

count=0
while IFS= read -r target; do
  cp "$source_readme" "$target"
  count=$((count + 1))
done < <(
  find "$repo_root/packages" \
    -path "$repo_root/packages/integration-tests" -prune -o \
    -path '*/node_modules/*' -prune -o \
    -type f -name 'README.md' -print | sort
)

echo "Copied $source_readme to $count package README file(s)."
