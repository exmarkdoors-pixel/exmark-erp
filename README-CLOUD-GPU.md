# EXMARK ERP — Cloud GPU & Cloud Server Hosting Guide

This archive contains the complete production-grade source code of **EXMARK ERP v1.4.2**, configured for zero-friction deployment on **Cloud GPU pods, Cloud VMs, and Docker environments**.

---

## Supported Cloud Platforms

- **RunPod** (Secure Cloud / Community Cloud with RTX 3090, 4090, A4000, A5000, L4, A100)
- **Vast.ai** (On-demand GPU instances)
- **Lambda Labs** (GPU Cloud Instances)
- **AWS EC2** (G4dn, G5, or general compute t3/c6)
- **Google Cloud Platform** (Compute Engine with NVIDIA T4/L4)
- **DigitalOcean / Linode / Hetzner** (Standard Ubuntu 22.04 / 24.04 Cloud VPS)

---

## Option 1: 1-Click Native Linux Deployment (Recommended for RunPod / Vast.ai / AWS / Ubuntu)

### Step 1: Upload and Unzip
Upload `exmark-erp-cloud-gpu.zip` to your cloud instance (via SFTP, SCP, or Web UI file upload):
```bash
unzip exmark-erp-cloud-gpu.zip -d exmark-erp
cd exmark-erp
```

### Step 2: Make Script Executable & Run
```bash
chmod +x deploy-cloud-gpu.sh
bash deploy-cloud-gpu.sh
```

The script will automatically:
1. Detect any NVIDIA GPU (`nvidia-smi`).
2. Verify / install Node.js 22 LTS.
3. Install dependencies via `npm ci`.
4. Generate the Prisma ORM client and build the Next.js production bundle.
5. Launch the application in the background using **PM2** on port `4000`.

### Step 3: Access the Application
Open your browser and navigate to:
```
http://<YOUR_SERVER_PUBLIC_IP>:4000
```
Health Check endpoint:
```
http://<YOUR_SERVER_PUBLIC_IP>:4000/api/health
```

---

## Option 2: 1-Click Docker Compose Deployment

If your cloud instance has Docker & NVIDIA Container Toolkit installed:

```bash
# 1. Unzip
unzip exmark-erp-cloud-gpu.zip -d exmark-erp
cd exmark-erp

# 2. Start Full Stack (Next.js + PostgreSQL + Ollama GPU)
docker compose -f docker-compose.cloud-gpu.yml up -d --build

# 3. View Logs
docker compose -f docker-compose.cloud-gpu.yml logs -f exmark-erp
```

---

## Process Management Commands (PM2)

```bash
pm2 status              # View status of running ERP
pm2 logs exmark-erp     # View live real-time server logs
pm2 restart exmark-erp  # Restart server
pm2 stop exmark-erp     # Stop server
pm2 monit               # Interactive CPU/Memory/Network monitor
```

---

## Connecting Your Domain & Free SSL (Nginx + Certbot)

To bind `erp.yourdomain.com` with HTTPS:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config:
sudo tee /etc/nginx/sites-available/exmark-erp << 'EOF'
server {
    server_name erp.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/exmark-erp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Install free Let's Encrypt SSL:
sudo certbot --nginx -d erp.yourdomain.com
```

---

## Technical Support & Verification
- Health endpoint: `GET /api/health`
- Database store: PostgreSQL 18 with JSON dual-write
- Enterprise mode: Production Standalone Multi-Worker
