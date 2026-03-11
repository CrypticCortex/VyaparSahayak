#!/bin/bash
# launch-ec2.sh — One-shot EC2 launch for Vyapar Sahayak
# Run from repo root: bash scripts/launch-ec2.sh

set -euo pipefail

AWS="AWS_PROFILE=default aws"
REGION="ap-south-1"
APP_ID="d3odh0mbro0ew1"
KEY_NAME="vyapar-sahayak"
SG_NAME="vyapar-sg"
KEY_PATH="$HOME/.ssh/vyapar-sahayak.pem"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NEXT_CONFIG="$REPO_ROOT/vyapar-sahayak/next.config.ts"

# Load credentials from .env
ENV_FILE="$REPO_ROOT/vyapar-sahayak/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

# Parse .env values (strip quotes)
get_env() { grep "^$1=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'"; }
DATABASE_URL=$(get_env DATABASE_URL)
TURSO_AUTH_TOKEN=$(get_env TURSO_AUTH_TOKEN)
GOOGLE_CLOUD_API_KEY=$(get_env GOOGLE_CLOUD_API_KEY)
BEDROCK_ACCESS_KEY_ID=$(get_env AWS_ACCESS_KEY_ID)
BEDROCK_SECRET_ACCESS_KEY=$(get_env AWS_SECRET_ACCESS_KEY)

echo "============================================"
echo "  Vyapar Sahayak — EC2 Deployment"
echo "  Region: $REGION"
echo "============================================"
echo ""

# ── STEP 1: EC2 Key Pair ──────────────────────────────────────────────────────
echo "[1/7] Checking EC2 key pair..."
if eval "$AWS ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION" &>/dev/null; then
  echo "  Key pair '$KEY_NAME' already exists"
  if [ ! -f "$KEY_PATH" ]; then
    echo "  WARNING: $KEY_PATH not found locally — SSH may not work"
  fi
else
  eval "$AWS ec2 create-key-pair \
    --key-name $KEY_NAME \
    --region $REGION \
    --query 'KeyMaterial' \
    --output text" > "$KEY_PATH"
  chmod 400 "$KEY_PATH"
  echo "  Key saved to $KEY_PATH"
fi

# ── STEP 2: Security Group ────────────────────────────────────────────────────
echo "[2/7] Setting up security group..."
SG_ID=$(eval "$AWS ec2 describe-security-groups \
  --filters 'Name=group-name,Values=$SG_NAME' \
  --region $REGION \
  --query 'SecurityGroups[0].GroupId' \
  --output text" 2>/dev/null)

if [ -z "$SG_ID" ] || [ "$SG_ID" = "None" ]; then
  SG_ID=$(eval "$AWS ec2 create-security-group \
    --group-name $SG_NAME \
    --description 'Vyapar Sahayak web server' \
    --region $REGION \
    --query 'GroupId' \
    --output text")
  echo "  Created SG: $SG_ID"

  eval "$AWS ec2 authorize-security-group-ingress \
    --group-id $SG_ID --region $REGION \
    --protocol tcp --port 22 --cidr 0.0.0.0/0" &>/dev/null
  eval "$AWS ec2 authorize-security-group-ingress \
    --group-id $SG_ID --region $REGION \
    --protocol tcp --port 80 --cidr 0.0.0.0/0" &>/dev/null
  eval "$AWS ec2 authorize-security-group-ingress \
    --group-id $SG_ID --region $REGION \
    --protocol tcp --port 443 --cidr 0.0.0.0/0" &>/dev/null
  echo "  Rules: SSH(22), HTTP(80), HTTPS(443)"
else
  echo "  Using existing SG: $SG_ID"
fi

# ── STEP 3: Find latest Amazon Linux 2023 AMI ────────────────────────────────
echo "[3/7] Finding latest Amazon Linux 2023 AMI..."
AMI_ID=$(eval "$AWS ec2 describe-images \
  --owners amazon \
  --filters \
    'Name=name,Values=al2023-ami-2023*' \
    'Name=architecture,Values=x86_64' \
    'Name=state,Values=available' \
  --region $REGION \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text")
echo "  AMI: $AMI_ID"

# ── STEP 4: Build user-data script ───────────────────────────────────────────
echo "[4/7] Preparing setup script..."

USERDATA_FILE=$(mktemp /tmp/vyapar-userdata-XXXXX.sh)

cat > "$USERDATA_FILE" << USERDATA_HEREDOC
#!/bin/bash
set -e
exec > /var/log/vyapar-setup.log 2>&1

echo "=== Vyapar Sahayak EC2 Setup -- \$(date) ==="

echo "[1/7] Installing system packages..."
dnf update -y --quiet
dnf install -y git nginx

echo "[2/7] Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
node --version && npm --version

echo "[3/7] Installing PM2..."
npm install -g pm2

echo "[4/7] Cloning repository..."
sudo -u ec2-user git clone https://github.com/CrypticCortex/VyaparSahayak /home/ec2-user/app

echo "[5/7] Writing .env..."
cat > /home/ec2-user/app/vyapar-sahayak/.env << 'DOTENVEOF'
DATABASE_URL="${DATABASE_URL}"
TURSO_AUTH_TOKEN="${TURSO_AUTH_TOKEN}"
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=${BEDROCK_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${BEDROCK_SECRET_ACCESS_KEY}
BEDROCK_REGION=us-east-1
BEDROCK_TEXT_MODEL=amazon.nova-lite-v1:0
BEDROCK_ACCESS_KEY_ID=${BEDROCK_ACCESS_KEY_ID}
BEDROCK_SECRET_ACCESS_KEY=${BEDROCK_SECRET_ACCESS_KEY}
CHAT_USE_BEDROCK=true
GOOGLE_CLOUD_API_KEY="${GOOGLE_CLOUD_API_KEY}"
NEXT_PUBLIC_BASE_URL=__WILL_BE_REPLACED__
DOTENVEOF
chown ec2-user:ec2-user /home/ec2-user/app/vyapar-sahayak/.env

echo "[6/7] Building app (takes 5-8 min)..."
cd /home/ec2-user/app/vyapar-sahayak
sudo -u ec2-user npm ci 2>&1
sudo -u ec2-user npx prisma generate 2>&1
sudo -u ec2-user npm run build 2>&1
echo "Build complete!"

echo "[7/7] Starting services..."
cp /home/ec2-user/app/vyapar-sahayak/nginx.conf /etc/nginx/conf.d/vyapar.conf
rm -f /etc/nginx/conf.d/default.conf
nginx -t
systemctl enable nginx && systemctl start nginx

sudo -u ec2-user bash -c "cd /home/ec2-user/app/vyapar-sahayak && pm2 start ecosystem.config.js && pm2 save"
env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user
systemctl enable pm2-ec2-user

echo "=== Setup COMPLETE at \$(date) ==="
USERDATA_FILE_IP=\$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "App running at http://\$USERDATA_FILE_IP/"
USERDATA_HEREDOC

# ── STEP 5: Launch EC2 Instance ───────────────────────────────────────────────
echo "[5/7] Launching EC2 instance (t3.medium)..."

INSTANCE_ID=$(eval "$AWS ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.medium \
  --key-name $KEY_NAME \
  --security-group-ids $SG_ID \
  --region $REGION \
  --user-data file://$USERDATA_FILE \
  --block-device-mappings '[{\"DeviceName\":\"/dev/xvda\",\"Ebs\":{\"VolumeSize\":20,\"VolumeType\":\"gp3\"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=vyapar-sahayak}]' \
  --query 'Instances[0].InstanceId' \
  --output text")

echo "  Instance: $INSTANCE_ID"
rm -f "$USERDATA_FILE"

# ── STEP 6: Elastic IP ────────────────────────────────────────────────────────
echo "[6/7] Allocating Elastic IP..."
ALLOC_ID=$(eval "$AWS ec2 allocate-address \
  --domain vpc \
  --region $REGION \
  --query 'AllocationId' \
  --output text")

echo "  Waiting for instance to start..."
eval "$AWS ec2 wait instance-running \
  --instance-ids $INSTANCE_ID \
  --region $REGION"

eval "$AWS ec2 associate-address \
  --instance-id $INSTANCE_ID \
  --allocation-id $ALLOC_ID \
  --region $REGION" &>/dev/null

ELASTIC_IP=$(eval "$AWS ec2 describe-addresses \
  --allocation-ids $ALLOC_ID \
  --region $REGION \
  --query 'Addresses[0].PublicIp' \
  --output text")

echo "  Elastic IP: $ELASTIC_IP"

# ── STEP 7: Wait for app + configure redirect ─────────────────────────────────
echo "[7/7] Waiting for app to be ready (build takes ~8 min)..."
echo "  Monitor: ssh -i $KEY_PATH ec2-user@$ELASTIC_IP 'sudo tail -f /var/log/vyapar-setup.log'"
echo ""

MAX_WAIT=900
WAITED=0
APP_READY=false

while [ $WAITED -lt $MAX_WAIT ]; do
  sleep 30
  WAITED=$((WAITED + 30))
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "http://$ELASTIC_IP/api/ping" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    APP_READY=true
    echo "  App is UP after ${WAITED}s!"
    break
  fi
  echo "  ...[$WAITED s] status=$HTTP_CODE — still building..."
done

if [ "$APP_READY" = "false" ]; then
  echo ""
  echo "  WARNING: App not responding after ${MAX_WAIT}s."
  echo "  SSH in and check: ssh -i $KEY_PATH ec2-user@$ELASTIC_IP"
  echo "  Log: sudo cat /var/log/vyapar-setup.log"
fi

# Fix NEXT_PUBLIC_BASE_URL via SSH
echo "  Updating NEXT_PUBLIC_BASE_URL and restarting..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=15 \
  "ec2-user@$ELASTIC_IP" \
  "sed -i 's|NEXT_PUBLIC_BASE_URL=__WILL_BE_REPLACED__|NEXT_PUBLIC_BASE_URL=http://$ELASTIC_IP|' \
   /home/ec2-user/app/vyapar-sahayak/.env && pm2 restart vyapar-sahayak" 2>/dev/null || true

# Update next.config.ts with actual IP (replaces placeholder)
sed -i "s|__EC2_REDIRECT_URL__|http://$ELASTIC_IP|g" "$NEXT_CONFIG"
echo "  Updated $NEXT_CONFIG"

# Set EC2_REDIRECT_URL in Amplify and trigger rebuild
echo "  Setting EC2_REDIRECT_URL in Amplify env vars..."
eval "$AWS amplify update-branch \
  --app-id $APP_ID \
  --branch-name main \
  --region $REGION \
  --environment-variables \
  'BEDROCK_REGION=us-east-1,BEDROCK_TEXT_MODEL=amazon.nova-lite-v1:0,CHAT_USE_BEDROCK=true,DATABASE_URL=libsql://vyapar-sahayak-crypticcortex.aws-ap-south-1.turso.io,TURSO_AUTH_TOKEN=${TURSO_AUTH_TOKEN},BEDROCK_ACCESS_KEY_ID=${BEDROCK_ACCESS_KEY_ID},BEDROCK_SECRET_ACCESS_KEY=${BEDROCK_SECRET_ACCESS_KEY},EC2_REDIRECT_URL=http://${ELASTIC_IP}'" \
  &>/dev/null
echo "  Done."

# ── DONE ─────────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  ALL DONE!"
echo "============================================"
echo ""
echo "  Instance:   $INSTANCE_ID"
echo "  Elastic IP: $ELASTIC_IP"
echo "  App URL:    http://$ELASTIC_IP"
echo "  Demo:       http://$ELASTIC_IP/demo"
echo "  SSH:        ssh -i $KEY_PATH ec2-user@$ELASTIC_IP"
echo ""
echo "  To activate the Amplify redirect, push these files:"
echo ""
echo "    git add vyapar-sahayak/next.config.ts vyapar-sahayak/ecosystem.config.js"
echo "    git add vyapar-sahayak/nginx.conf"
echo "    git commit -m 'feat: migrate to EC2, redirect Amplify URL to http://$ELASTIC_IP'"
echo "    git push"
echo ""
echo "  After pushing, https://main.d3odh0mbro0ew1.amplifyapp.com/"
echo "  will redirect to http://$ELASTIC_IP/"
echo ""
