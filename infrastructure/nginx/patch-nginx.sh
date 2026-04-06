#!/usr/bin/env bash
# patch-nginx.sh <nginx_conf> <blocks_file>
#
# Builds the complete nginx config for both kwadle.ru and korpmes.ru.
#
# Strategy:
# 1. Read the ACTUAL config from inside the running container
#    (the container holds the original bind-mount inode, which may differ
#    from the host file after previous deploys used mv)
# 2. Extract the kwadle.ru base by stripping any existing korpmes content
# 3. Strip trailing blank lines and the http{} closing brace
# 4. Append our korpmes.ru server blocks and close http{}
#
# Output: /tmp/nginx_patched.conf (also written to $NGINX_CONF on host)
set -euo pipefail

NGINX_CONF="$1"
BLOCKS_FILE="$2"

# Ensure LF line endings on blocks file
sed -i 's/\r$//' "$BLOCKS_FILE"

# ── Step 1: Get the source config ────────────────────────────────────────────
# Try reading from the container first (has the original inode).
# Fall back to the host file if container read fails.
if docker exec tasktracker-nginx-1 cat /etc/nginx/nginx.conf > /tmp/nginx_source.conf 2>/dev/null; then
  echo "Read config from container: $(wc -l < /tmp/nginx_source.conf) lines"
else
  echo "Container read failed, using host file"
  cp "$NGINX_CONF" /tmp/nginx_source.conf
fi

# Ensure LF
sed -i 's/\r$//' /tmp/nginx_source.conf

# ── Step 2: Strip any existing korpmes content ───────────────────────────────
KORPMES_LINE=$(grep -n "korpmes" /tmp/nginx_source.conf 2>/dev/null | head -1 | cut -d: -f1 || true)
if [ -n "$KORPMES_LINE" ]; then
  head -n $((KORPMES_LINE - 1)) /tmp/nginx_source.conf > /tmp/nginx_base.conf
  echo "Stripped korpmes section (was at line $KORPMES_LINE)"
else
  cp /tmp/nginx_source.conf /tmp/nginx_base.conf
  echo "No existing korpmes section found"
fi

# ── Step 3: Strip trailing blank lines and unindented closing brace ──────────
# The base should end with the kwadle.ru content inside http{}.
# We remove: blank lines, and "}" at column 0 (which closes http{}).
# We keep: "  }" or similar (indented, closes server/location blocks).
TOTAL=$(wc -l < /tmp/nginx_base.conf)
KEEP=$TOTAL
while [ "$KEEP" -gt 0 ]; do
  LINE=$(sed -n "${KEEP}p" /tmp/nginx_base.conf)
  # Remove all whitespace to check if line is blank
  NOSPACE=$(echo "$LINE" | tr -d '[:space:]')
  if [ -z "$NOSPACE" ]; then
    # Blank line — strip
    KEEP=$((KEEP - 1))
  elif [ "$NOSPACE" = "}" ] && echo "$LINE" | grep -q "^}"; then
    # Unindented } (http closing brace) — strip
    KEEP=$((KEEP - 1))
  else
    break
  fi
done
head -n "$KEEP" /tmp/nginx_base.conf > /tmp/nginx_body.conf
echo "Body: $KEEP lines (trimmed $((TOTAL - KEEP)) trailing)"

# ── Step 4: Assemble: body + empty line + blocks + closing brace ─────────────
{
  cat /tmp/nginx_body.conf
  echo ""
  cat "$BLOCKS_FILE"
  echo "}"
} > /tmp/nginx_patched.conf

echo "Patched: $(wc -l < /tmp/nginx_patched.conf) lines"

# ── Step 5: Write to the host file ──────────────────────────────────────────
cat /tmp/nginx_patched.conf > "$NGINX_CONF"
echo "Written to $NGINX_CONF"
