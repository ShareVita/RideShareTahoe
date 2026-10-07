#!/usr/bin/env bash
set -euo pipefail
# Generate to a temporary file so a failed CLI command cannot erase the schema.
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
npx supabase gen types --local --schema public > "$tmp"
npx prettier --config .prettierrc --parser typescript --write "$tmp"
mv "$tmp" types/database.types.ts
