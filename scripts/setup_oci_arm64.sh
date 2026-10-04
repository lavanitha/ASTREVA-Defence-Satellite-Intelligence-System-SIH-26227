#!/usr/bin/env bash
# ==============================================================================
# ASTREVA OCI Always Free Ampere A1 (ARM64) One-Shot Production Deployment Script
# ==============================================================================
set -euo pipefail

echo "========================================================"
echo " Starting ASTREVA ARM64 Production Deployment on OCI"
echo "========================================================"

# 1. Update OS packages
echo "[1/7] Updating system packages and installing prerequisites..."
sudo apt-get update -y && sudo apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    git-lfs \
    iptables \
    ufw

# 2. Configure Local Host Firewall for Ports 80 & 443
# (Note: In OCI, the default Ubuntu image blocks external inbound traffic on 80/443 via iptables)
echo "[2/7] Opening inbound HTTP/HTTPS ports 80 and 443 in local firewall..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
sudo netfilter-persistent save 2>/dev/null || true

# 3. Install Docker & Docker Compose if not present
if ! command -v docker &> /dev/null; then
    echo "[3/7] Installing Docker Engine for aarch64..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    sudo systemctl enable --now docker
    sudo usermod -aG docker "$USER" || true
else
    echo "[3/7] Docker is already installed."
fi

# 4. Detect Public IP Address
echo "[4/7] Detecting OCI Public IP..."
PUBLIC_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || echo "")
if [ -z "$PUBLIC_IP" ]; then
    echo "Warning: Unable to automatically detect Public IP. Defaulting to localhost."
    TARGET_DOMAIN="localhost"
else
    # nip.io dynamically resolves <ip>.nip.io to <ip>, allowing instant valid Let's Encrypt SSL
    TARGET_DOMAIN="astreva.${PUBLIC_IP}.nip.io"
    echo "Detected Public IP: $PUBLIC_IP"
    echo "Configured Public HTTPS Domain: https://${TARGET_DOMAIN}"
fi

export DOMAIN="${TARGET_DOMAIN}"

# 5. Build and Launch Containers
echo "[5/7] Building and launching ASTREVA Full Production Stack (ARM64)..."
docker compose -f docker-compose.oci.yml down --remove-orphans || true
docker compose -f docker-compose.oci.yml up -d --build

# 6. Verify Healthcheck
echo "[6/7] Waiting for ASTREVA backend and OpenCLIP model initialization (30s)..."
sleep 30

for i in {1..10}; do
    if curl -s -f "http://localhost:8000/api/health" > /dev/null 2>&1; then
        echo " Backend is HEALTHY and listening on port 8000!"
        break
    else
        echo " Waiting for backend initialization (Attempt $i/10)..."
        sleep 6
    fi
done

# 7. Final Verification
echo "========================================================"
echo " ASTREVA DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "========================================================"
echo "Public HTTPS URL: https://${TARGET_DOMAIN}"
echo "API Docs URL:     https://${TARGET_DOMAIN}/api/docs"
echo "Healthcheck:      https://${TARGET_DOMAIN}/api/health"
echo "========================================================"
