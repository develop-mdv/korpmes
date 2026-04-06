#!/usr/bin/env bash
# patch-nginx.sh <nginx_conf> <blocks_file>
#
# Rebuilds nginx config with korpmes.ru server blocks inside http{}.
# Idempotent — safe to run multiple times on any state of the config.
#
# Output: writes to $NGINX_CONF and /tmp/nginx_patched.conf
set -euo pipefail

NGINX_CONF="$1"
BLOCKS_FILE="$2"

# Ensure LF line endings (repo committed from Windows)
sed -i 's/\r$//' "$NGINX_CONF" "$BLOCKS_FILE"

echo "Input: $(wc -l < "$NGINX_CONF") lines"

# ── Step 1: Strip any existing korpmes content from the file ─────────────────
KORPMES_LINE=$(grep -n "korpmes" "$NGINX_CONF" 2>/dev/null | head -1 | cut -d: -f1 || true)
if [ -n "$KORPMES_LINE" ]; then
  head -n $((KORPMES_LINE - 1)) "$NGINX_CONF" > /tmp/nginx_base.conf
  echo "Stripped existing korpmes section (was at line $KORPMES_LINE)"
else
  cp "$NGINX_CONF" /tmp/nginx_base.conf
  echo "No existing korpmes section found"
fi

# ── Step 2: Strip trailing blank lines and top-level closing brace ───────────
# The base may end with:  ...content  \n  }  \n  }  \n  (blank)
# We keep indented } (like "  }" which closes server/location blocks)
# but strip unindented "}" (which closes the http{} block) and blanks.
TOTAL=$(wc -l < /tmp/nginx_base.conf)
KEEP=$TOTAL
while [ "$KEEP" -gt 0 ]; do
  LINE=$(sed -n "${KEEP}p" /tmp/nginx_base.conf)
  TRIMMED=$(echo "$LINE" | sed 's/[[:space:]]//g')
  # Strip blank lines and UNINDENTED } (http closing brace).
  # Keep indented } like "  }" (those close server/location blocks).
  if [ -z "$TRIMMED" ]; then
    KEEP=$((KEEP - 1))
  elif [ "$TRIMMED" = "}" ] && echo "$LINE" | grep -q "^}"; then
    KEEP=$((KEEP - 1))
  else
    break
  fi
done
head -n "$KEEP" /tmp/nginx_base.conf > /tmp/nginx_body.conf
echo "Body: $KEEP lines (trimmed $((TOTAL - KEEP)) trailing lines)"

# ── Step 3: Assemble: body + blocks + closing brace ─────────────────────────
{
  cat /tmp/nginx_body.conf
  echo ""
  cat "$BLOCKS_FILE"
  echo "}"
} > /tmp/nginx_patched.conf

echo "Patched: $(wc -l < /tmp/nginx_patched.conf) lines"

# ── Step 4: Write to the host file ──────────────────────────────────────────
cat /tmp/nginx_patched.conf > "$NGINX_CONF"
echo "Written to $NGINX_CONF"
