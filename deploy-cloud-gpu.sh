#!/usr/bin/env bash
# ==============================================================================
# EXMARK ERP — 1-Click Cloud GPU & Linux Server Automated Deployment Script
# Tested on: Ubuntu 22.04 LTS, Ubuntu 24.04 LTS, Debian 12
# Providers: RunPod, Vast.ai, Lambda Labs, AWS EC2, GCP, DigitalOcean
# ==============================================================================

set -e

# Color definitions
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${GREEN}  EXMARK ERP — Enterprise Cloud GPU Deployment Engine v1.4.2${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# 1. Detect NVIDIA GPU
echo -e "\n${YELLOW}[Step 1/6] Checking NVIDIA GPU Status...${NC}"
if command -v nvidia-smi &> /dev/null; then
    echo -e "${GREEN}✓ NVIDIA GPU Detected:${NC}"
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader
else
    echo -e "${YELLOW}ℹ No dedicated NVIDIA GPU detected via nvidia-smi.${NC}"
    echo -e "  Continuing in high-performance CPU multi-threaded mode."
fi

# 2. Check / Install Node.js 22 LTS & Build Essentials
echo -e "\n${YELLOW}[Step 2/6] Verifying Node.js Runtime...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
    echo -e "${YELLOW}Installing Node.js 22.x LTS...${NC}"
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -y
        sudo apt-get install -y curl build-essential
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
        sudo apt-get install -y nodejs
    else
        echo -e "${RED}Error: Package manager not recognized. Please install Node.js >= 20.0.0 manually.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Node.js version: $(node -v) | npm version: $(npm -v)${NC}"

# 3. Environment File Configuration
echo -e "\n${YELLOW}[Step 3/6] Setting up Production Environment...${NC}"
if [ ! -f .env.local ] && [ ! -f .env.production ]; then
    if [ -f .env.cloud.example ]; then
        echo -e "Creating .env.production from .env.cloud.example..."
        cp .env.cloud.example .env.production
    elif [ -f .env.example ]; then
        echo -e "Creating .env.production from .env.example..."
        cp .env.example .env.production
    fi
    # Generate random secret if needed
    RAND_SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
    sed -i "s/REPLACE_WITH_GENERATED_32_CHAR_RANDOM_SECRET_KEY_FOR_PROD/${RAND_SECRET}/g" .env.production 2>/dev/null || true
    echo -e "${GREEN}✓ .env.production configured.${NC}"
else
    echo -e "${GREEN}✓ Existing environment file found.${NC}"
fi

# 4. Install Dependencies
echo -e "\n${YELLOW}[Step 4/6] Installing Dependencies via npm ci...${NC}"
npm install --production=false

# 5. Prisma ORM Generation & Next.js Build
echo -e "\n${YELLOW}[Step 5/6] Building Production Next.js Standalone Bundle...${NC}"
npx prisma generate
npm run build
echo -e "${GREEN}✓ Build succeeded.${NC}"

# 6. Process Management with PM2
echo -e "\n${YELLOW}[Step 6/6] Launching Production Daemon...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 globally..."
    npm install -g pm2
fi

pm2 delete exmark-erp 2>/dev/null || true
pm2 start scripts/start-production.mjs --name "exmark-erp" -- --port 4000 --host 0.0.0.0
pm2 save

PUBLIC_IP=$(curl -s https://api.ipify.org || curl -s ifconfig.me || echo "YOUR_SERVER_IP")

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}  ✓ EXMARK ERP IS NOW LIVE ON CLOUD GPU!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "  Web URL:      ${BLUE}http://${PUBLIC_IP}:4000${NC}"
echo -e "  Local URL:    ${BLUE}http://localhost:4000${NC}"
echo -e "  Health Check: ${BLUE}http://${PUBLIC_IP}:4000/api/health${NC}"
echo -e "  Process Log:  ${YELLOW}pm2 logs exmark-erp${NC}"
echo -e "  Process Mon:  ${YELLOW}pm2 monit${NC}"
echo -e "${GREEN}==============================================================================${NC}\n"
