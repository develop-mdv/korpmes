#!/usr/bin/env bash
# patch-nginx.sh <nginx_conf> <blocks_file>
# Inserts korpmes.ru server blocks inside the http{} block.
# Idempotent: removes any existing korpmes.ru entries first.
# Outputs patched config to /tmp/nginx_patched.conf (used by caller).
set -euo pipefail

NGINX_CONF="$1"
BLOCKS_FILE="$2"

# ── Step 1: Remove any existing korpmes.ru section ──────────────────────────
KORPMES_LINE=$(grep -n "korpmes" "$NGINX_CONF" 2>/dev/null | head -1 | cut -d: -f1 || true)
if [ -n "$KORPMES_LINE" ]; then
  head -n $((KORPMES_LINE - 1)) "$NGINX_CONF" > /tmp/nginx_base.conf
  echo "Removed existing korpmes.ru section (was at line $KORPMES_LINE)"
else
  cp "$NGINX_CONF" /tmp/nginx_base.conf
  echo "No existing korpmes.ru section found"
fi

# ── Step 2: Find the http{} closing brace ────────────────────────────────────
# Case A: base has a standalone } line (original/clean state)
#   → strip it, we'll add it back after the blocks
# Case B: no standalone } in base (previous patch already removed it and put
#   it after the blocks section) → base ends with the open http{} content,
#   just append blocks + } directly
LAST_BRACE=$(grep -n "^}[[:space:]]*$" /tmp/nginx_base.conf | tail -1 | cut -d: -f1 || true)

if [ -n "$LAST_BRACE" ]; then
  echo "Found http{} closing brace at line $LAST_BRACE in base — stripping it"
  head -n $((LAST_BRACE - 1)) /tmp/nginx_base.conf > /tmp/nginx_body.conf
else
  echo "No standalone } in base — http{} already open, appending directly"
  cp /tmp/nginx_base.conf /tmp/nginx_body.conf
fi

# ── Step 3: Build the patched file ───────────────────────────────────────────
{
  cat /tmp/nginx_body.conf
  echo ""
  cat "$BLOCKS_FILE"
  echo "}"
} > /tmp/nginx_patched.conf

# ── Step 4: Also overwrite the host file (cp preserves inode) ────────────────
cp /tmp/nginx_patched.conf "$NGINX_CONF"

echo "Nginx config patched: korpmes.ru blocks inserted inside http{}"
