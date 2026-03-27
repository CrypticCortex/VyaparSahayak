#!/usr/bin/env bash
# deploy.sh -- Complete clean deployment of Vyapar Sahayak to EC2
# Run from: vyapar-sahayak/ directory
# Usage: bash scripts/deploy.sh [--skip-local-build] [--skip-seed] [--seed-only]
set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────────────
EC2_HOST="13.235.222.90"
EC2_USER="ec2-user"
EC2_APP_DIR="/home/ec2-user/app/vyapar-sahayak"
SSH_KEY="$HOME/.ssh/vyapar-sahayak.pem"
PM2_NAME="vyapar-sahayak"
HEALTH_URL="http://${EC2_HOST}/api/ping"
SEED_URL="http://${EC2_HOST}/api/seed"

# Required env vars (checked in preflight)
REQUIRED_VARS=(
  DATABASE_URL
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  BEDROCK_REGION
  BEDROCK_TEXT_MODEL
  CHAT_USE_BEDROCK
  GOOGLE_CLOUD_API_KEY
  AUTH_SECRET
)

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

# ── Parse flags ──────────────────────────────────────────────────────────────
SKIP_LOCAL_BUILD=false
SKIP_SEED=false
SEED_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --skip-local-build) SKIP_LOCAL_BUILD=true ;;
    --skip-seed)        SKIP_SEED=true ;;
    --seed-only)        SEED_ONLY=true ;;
    --help|-h)
      echo "Usage: bash scripts/deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --skip-local-build  Skip local TypeScript check and build"
      echo "  --skip-seed         Skip post-deploy seeding"
      echo "  --seed-only         Only run the seed step, skip everything else"
      echo "  --help              Show this help"
      exit 0
      ;;
    *) err "Unknown flag: $arg (use --help)" ;;
  esac
done

# ── Resolve script directory -> project root ─────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"
log "Working directory: $PROJECT_DIR"

# ── SSH helper ───────────────────────────────────────────────────────────────
build_ssh_args() {
  local args=(-o StrictHostKeyChecking=no -o ConnectTimeout=15)
  if [ -f "$SSH_KEY" ]; then
    args+=(-i "$SSH_KEY")
  fi
  echo "${args[@]}"
}

run_ssh() {
  local ssh_args
  ssh_args=$(build_ssh_args)
  # shellcheck disable=SC2086
  ssh $ssh_args "${EC2_USER}@${EC2_HOST}" "$@"
}

# ── Seed-only mode ───────────────────────────────────────────────────────────
if [ "$SEED_ONLY" = true ]; then
  log "Seed-only mode -- hitting ${SEED_URL}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST --max-time 120 "$SEED_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    log "Seed successful (HTTP $HTTP_CODE)"
  else
    err "Seed failed (HTTP $HTTP_CODE)"
  fi
  exit 0
fi

# ════════════════════════════════════════════════════════════════════════════════
# PHASE 1: Pre-flight checks (local)
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Phase 1: Pre-flight checks${NC}"
echo -e "${CYAN}============================================${NC}"

# 1a. Check we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "prisma" ]; then
  err "Not in vyapar-sahayak directory. Run from: cd vyapar-sahayak && bash scripts/deploy.sh"
fi
log "Project directory verified"

# 1b. Check .env exists and has required vars
if [ ! -f ".env" ]; then
  err ".env file not found in $PROJECT_DIR"
fi

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${var}=" .env; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  err "Missing env vars in .env: ${MISSING_VARS[*]}"
fi
log ".env has all required variables"

# 1c. Check git is clean
if ! git diff --quiet HEAD 2>/dev/null; then
  warn "Uncommitted changes detected. Deployment will use whatever is pushed to remote."
  echo -n "  Continue anyway? [y/N] "
  read -r REPLY
  if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    err "Aborted. Commit and push first."
  fi
else
  log "Git working tree is clean"
fi

# 1d. Check SSH connectivity
info "Testing SSH to ${EC2_HOST}..."
if run_ssh "echo ok" &>/dev/null; then
  log "SSH connection to EC2 verified"
else
  err "Cannot SSH to ${EC2_USER}@${EC2_HOST}. Check your key at ${SSH_KEY}"
fi

# ════════════════════════════════════════════════════════════════════════════════
# PHASE 2: Local validation build
# ════════════════════════════════════════════════════════════════════════════════
if [ "$SKIP_LOCAL_BUILD" = false ]; then
  echo ""
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  Phase 2: Local validation${NC}"
  echo -e "${CYAN}============================================${NC}"

  # 2a. npm install
  log "Running npm install..."
  SHELL=/bin/sh npm install --prefer-offline 2>&1 | tail -3

  # 2b. prisma generate
  log "Running prisma generate..."
  SHELL=/bin/sh npx prisma generate 2>&1 | tail -3

  # 2c. prisma db push (sync schema to Aurora)
  log "Syncing schema to Aurora (prisma db push)..."
  SHELL=/bin/sh npx prisma db push --accept-data-loss 2>&1 | tail -5

  # 2d. TypeScript check
  log "Checking TypeScript..."
  SHELL=/bin/sh npx tsc --noEmit 2>&1 | tail -5
  log "TypeScript check passed"

  # 2e. Production build
  log "Running production build..."
  SHELL=/bin/sh npm run build 2>&1 | tail -10
  log "Local build succeeded"
else
  warn "Skipping local build (--skip-local-build)"
fi

# ════════════════════════════════════════════════════════════════════════════════
# PHASE 3: Deploy to EC2
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Phase 3: Deploy to EC2 (${EC2_HOST})${NC}"
echo -e "${CYAN}============================================${NC}"

# 3a. Git pull
log "Pulling latest code on EC2..."
run_ssh "cd ${EC2_APP_DIR} && git pull origin main" 2>&1 | tail -5

# 3b. Sync .env to EC2 (without secrets in the script -- scp the local file)
log "Syncing .env to EC2..."
SSH_ARGS=$(build_ssh_args)
# shellcheck disable=SC2086
scp $SSH_ARGS ".env" "${EC2_USER}@${EC2_HOST}:${EC2_APP_DIR}/.env"
log ".env synced"

# 3c. npm install on EC2
log "Running npm install on EC2..."
run_ssh "cd ${EC2_APP_DIR} && npm install --prefer-offline" 2>&1 | tail -5

# 3d. prisma generate on EC2
log "Running prisma generate on EC2..."
run_ssh "cd ${EC2_APP_DIR} && npx prisma generate" 2>&1 | tail -3

# 3e. Build on EC2
log "Building on EC2 (this takes a few minutes)..."
run_ssh "cd ${EC2_APP_DIR} && npm run build" 2>&1 | tail -10
log "EC2 build complete"

# 3f. Restart pm2
log "Restarting PM2 process..."
run_ssh "cd ${EC2_APP_DIR} && pm2 restart ${PM2_NAME} --update-env" 2>&1 | tail -5
log "PM2 restarted"

# ════════════════════════════════════════════════════════════════════════════════
# PHASE 4: Post-deploy verification
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Phase 4: Post-deploy verification${NC}"
echo -e "${CYAN}============================================${NC}"

log "Waiting 10 seconds for server to start..."
sleep 10

# 4a. Health check with retries
MAX_RETRIES=6
RETRY_INTERVAL=5
HEALTHY=false

for i in $(seq 1 $MAX_RETRIES); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    HEALTHY=true
    log "Health check passed (HTTP 200) on attempt $i"
    break
  fi
  warn "Health check attempt $i/$MAX_RETRIES: HTTP $HTTP_CODE -- retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

if [ "$HEALTHY" = false ]; then
  err "Health check failed after $MAX_RETRIES attempts. Check PM2 logs: ssh ${EC2_USER}@${EC2_HOST} 'pm2 logs ${PM2_NAME} --lines 50'"
fi

# 4b. Seed if requested
if [ "$SKIP_SEED" = false ]; then
  echo -n "  Run seed? [y/N] "
  read -r REPLY
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    log "Seeding database via ${SEED_URL}..."
    SEED_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST --max-time 120 "$SEED_URL" 2>/dev/null)
    SEED_CODE=$(echo "$SEED_RESPONSE" | tail -1)
    SEED_BODY=$(echo "$SEED_RESPONSE" | head -n -1)
    if [ "$SEED_CODE" = "200" ]; then
      log "Seed successful"
      info "Response: $SEED_BODY"
    else
      warn "Seed returned HTTP $SEED_CODE"
      info "Response: $SEED_BODY"
    fi
  else
    info "Skipping seed"
  fi
else
  info "Skipping seed (--skip-seed)"
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "  App:    http://${EC2_HOST}"
echo "  Health: ${HEALTH_URL}"
echo "  SSH:    ssh ${EC2_USER}@${EC2_HOST}"
echo "  Logs:   ssh ${EC2_USER}@${EC2_HOST} 'pm2 logs ${PM2_NAME} --lines 50'"
echo ""
