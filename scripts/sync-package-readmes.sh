#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
source_readme="$repo_root/README.md"

if [[ ! -f "$source_readme" ]]; then
  echo "source README not found: $source_readme" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found on PATH" >&2
  exit 1
fi

count=0
while IFS= read -r package_dir; do
  [[ -z "$package_dir" ]] && continue
  target="$package_dir/README.md"
  cp "$source_readme" "$target"
  count=$((count + 1))
done < <(
  pnpm -r list --depth -1 --json \
    | node -e '
const fs = require("node:fs");
const repoRoot = process.argv[1];
const packages = JSON.parse(fs.readFileSync(0, "utf8"));
for (const pkg of packages) {
  if (!pkg.path || pkg.path === repoRoot) continue;
  if (pkg.path === `${repoRoot}/packages/integration-tests`) continue;
  if (!pkg.path.startsWith(`${repoRoot}/packages/`)) continue;
  process.stdout.write(`${pkg.path}\n`);
}
' "$repo_root"
)

echo "Copied $source_readme to $count package README file(s)."
