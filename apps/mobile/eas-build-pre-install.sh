#!/usr/bin/env bash
set -euo pipefail

# Run pnpm install from the monorepo workspace root so that
# workspace symlinks (including apps/mobile/node_modules/.bin/expo) are created correctly.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Installing from workspace root: $WORKSPACE_ROOT"
cd "$WORKSPACE_ROOT"
pnpm install
