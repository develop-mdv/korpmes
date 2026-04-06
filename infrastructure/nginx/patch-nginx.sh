#!/usr/bin/env bash
# patch-nginx.sh <nginx_conf> <blocks_file>
# Inserts korpmes.ru server blocks inside the http{} block.
# Idempotent: removes any existing korpmes.ru entries first.
set -euo pipefail

NGINX_CONF="$1"
BLOCKS_FILE="$2"

# Remove any existing korpmes.ru section (handles broken previous runs)
KORPMES_LINE=$(grep -n "korpmes" "$NGINX_CONF" 2>/dev/null | head -1 | cut -d: -f1 || true)
if [ -n "$KORPMES_LINE" ]; then
  head -n $((KORPMES_LINE - 1)) "$NGINX_CONF" > /tmp/nginx_base.conf
  echo "Removed existing korpmes.ru section (was at line $KORPMES_LINE)"
else
  cp "$NGINX_CONF" /tmp/nginx_base.conf
fi

# Find the last top-level closing } which closes the http{} block.
# Top-level } is the only one with no leading whitespace (^}$).
LAST_BRACE=$(grep -n "^}$" /tmp/nginx_base.conf | tail -1 | cut -d: -f1 || true)
if [ -z "$LAST_BRACE" ]; then
  echo "ERROR: Could not find closing } for http{} block in $NGINX_CONF" >&2
  exit 1
fi

# Build patched file: content before http closing }, our blocks, then }
head -n $((LAST_BRACE - 1)) /tmp/nginx_base.conf > /tmp/nginx_patched.conf
echo "" >> /tmp/nginx_patched.conf
cat "$BLOCKS_FILE" >> /tmp/nginx_patched.conf
echo "}" >> /tmp/nginx_patched.conf

cp /tmp/nginx_patched.conf "$NGINX_CONF"
echo "Nginx config patched: korpmes.ru blocks inserted inside http{}"
