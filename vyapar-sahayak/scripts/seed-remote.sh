#!/usr/bin/env bash
# seed-remote.sh -- Seed the remote Vyapar Sahayak database via API
# Usage: bash scripts/seed-remote.sh
set -euo pipefail

EC2_HOST="13.235.222.90"
SEED_URL="http://${EC2_HOST}/api/seed"

echo "Seeding remote database at ${SEED_URL}..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST --max-time 120 "$SEED_URL" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "[OK] Seed successful (HTTP ${HTTP_CODE})"
  echo "$BODY"
else
  echo "[FAIL] Seed failed (HTTP ${HTTP_CODE})"
  echo "$BODY"
  exit 1
fi
