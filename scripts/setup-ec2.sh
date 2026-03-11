#!/bin/bash
# setup-ec2.sh — runs ON the EC2 instance via user-data (as root)
# Logs everything to /var/log/vyapar-setup.log

set -e
exec > /var/log/vyapar-setup.log 2>&1

echo "=== Vyapar Sahayak EC2 Setup — $(date) ==="

# ── 1. System packages ────────────────────────────────────────────────────────
echo "[1/7] Installing system packages..."
dnf update -y --quiet
dnf install -y git nginx

# ── 2. Node.js 20 via NodeSource ──────────────────────────────────────────────
echo "[2/7] Installing Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
node --version
npm --version

# ── 3. PM2 globally ───────────────────────────────────────────────────────────
echo "[3/7] Installing PM2..."
npm install -g pm2

# ── 4. Clone repository ───────────────────────────────────────────────────────
echo "[4/7] Cloning repository..."
sudo -u ec2-user git clone https://github.com/CrypticCortex/VyaparSahayak /home/ec2-user/app

# ── 5. Write .env (credentials injected by launch-ec2.sh at launch time) ─────
echo "[5/7] Writing .env..."
# PLACEHOLDER_ENV_BLOCK — replaced by launch-ec2.sh before base64-encoding

chown ec2-user:ec2-user /home/ec2-user/app/vyapar-sahayak/.env

# ── 6. Build the Next.js app ──────────────────────────────────────────────────
echo "[6/7] Building app (this takes 5-8 minutes)..."
cd /home/ec2-user/app/vyapar-sahayak

sudo -u ec2-user npm ci --prefer-offline 2>&1
sudo -u ec2-user npx prisma generate 2>&1
sudo -u ec2-user npm run build 2>&1

echo "Build complete!"

# ── 7. Start services ─────────────────────────────────────────────────────────
echo "[7/7] Starting services..."

# nginx
cp /home/ec2-user/app/vyapar-sahayak/nginx.conf /etc/nginx/conf.d/vyapar.conf
# Remove default config that conflicts on port 80
rm -f /etc/nginx/conf.d/default.conf
nginx -t
systemctl enable nginx
systemctl start nginx

# PM2
sudo -u ec2-user bash -c "
  cd /home/ec2-user/app/vyapar-sahayak
  pm2 start ecosystem.config.js
  pm2 save
"

# PM2 startup (survive reboots)
env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ec2-user --hp /home/ec2-user
systemctl enable pm2-ec2-user

echo "=== Setup COMPLETE at $(date) ==="
echo "App running at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/"
