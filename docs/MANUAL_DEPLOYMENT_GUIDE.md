# 🚀 NOVA Backend - Manual Deployment Guide

**VPS:** 167.71.210.47  
**Project:** homix (Doppler)  
**Registry:** homix-registry (DigitalOcean)  
**Port:** 4000

---

## ✅ Prerequisites Check

### On Local Machine:
- ✅ Docker Desktop running
- ✅ `doctl` CLI installed (DigitalOcean CLI)
- ✅ SSH access to VPS: `ssh root@167.71.210.47`

### On VPS (will setup):
- Docker & Docker Compose
- Doppler CLI
- Project directory `/app/nova-be`

---

## 📦 PART 1: Setup VPS (One-time)

### Step 1: SSH to VPS

```bash
ssh root@167.71.210.47
```

### Step 2: Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify
docker --version
docker compose version
```

### Step 3: Install Doppler CLI

```bash
# Add Doppler repository
curl -sLf 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list

# Install
apt update && apt install doppler

# Verify
doppler --version
```

### Step 4: Authenticate Doppler

```bash
# Login (will open browser for OAuth)
doppler login

# Or use service token (recommended for production)
doppler configure set token <YOUR_SERVICE_TOKEN>
```

### Step 5: Create Project Directory

```bash
# Create directory
mkdir -p /app/nova-be
cd /app/nova-be

# Setup Doppler for this directory
doppler setup --project homix --config prd

# Verify secrets
doppler secrets
```

### Step 6: Configure Firewall

```bash
# Allow necessary ports
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS  
ufw allow 4000/tcp  # Application

# Enable firewall
ufw enable

# Check status
ufw status
```

---

## 🚀 PART 2: Deploy Application

### Option A: Build on VPS (Recommended)

#### Step 1: Clone Repository

```bash
cd /app/nova-be

# If first time:
git clone https://github.com/<YOUR_ORG>/nova-be.git .

# If already cloned:
git pull origin main
```

#### Step 2: Login to DigitalOcean Registry

```bash
# Using DO Access Token
echo <YOUR_DO_TOKEN> | docker login registry.digitalocean.com -u <YOUR_DO_TOKEN> --password-stdin

# Or using doctl (if installed)
doctl registry login
```

#### Step 3: Build Docker Image

```bash
# Build image
docker build -t registry.digitalocean.com/homix-registry/nova-be:latest -f Dockerfile .

# Push to registry (optional, for backup)
docker push registry.digitalocean.com/homix-registry/nova-be:latest
```

#### Step 4: Deploy with Docker Compose + Doppler

```bash
cd /app/nova-be

# Pull latest image (if pushed to registry)
docker compose -f docker-compose.production.yml pull

# Start services with Doppler secrets
doppler run --project homix --config prd -- docker compose -f docker-compose.production.yml up -d

# Check logs
docker compose -f docker-compose.production.yml logs -f
```

---

### Option B: Build Locally, Push to Registry

#### Step 1: Build on Local Machine

```powershell
# On Windows (PowerShell)
cd C:\Users\thinkbook\Documents\code\jira-github\nova-be

# Build image
docker build -t registry.digitalocean.com/homix-registry/nova-be:latest -f Dockerfile .

# Login to DO Registry
doctl registry login

# Push image
docker push registry.digitalocean.com/homix-registry/nova-be:latest
```

#### Step 2: Deploy on VPS

```bash
# SSH to VPS
ssh root@167.71.210.47

cd /app/nova-be

# Copy docker-compose.production.yml if not exists
# (or git pull to get latest)

# Login to registry
doctl registry login

# Pull image
docker compose -f docker-compose.production.yml pull

# Deploy with Doppler
doppler run --project homix --config prd -- docker compose -f docker-compose.production.yml up -d
```

---

## 🔍 PART 3: Verification

### Check Container Status

```bash
# List running containers
docker ps

# Should see:
# - nova-postgres (running)
# - nova-api (running)
```

### Check Application Logs

```bash
# View all logs
docker compose -f docker-compose.production.yml logs

# Follow logs real-time
docker compose -f docker-compose.production.yml logs -f api

# Check specific service
docker logs nova-api
```

### Test Application

```bash
# From VPS
curl http://localhost:4000

# From your machine
curl http://167.71.210.47:4000

# Should return: {"message": "Hello World!"} or similar
```

### Check Database

```bash
# Connect to PostgreSQL
docker exec -it nova-postgres psql -U postgres -d nova_db

# List tables
\dt

# Check migrations
SELECT * FROM drizzle_migrations;

# Exit
\q
```

---

## 🔄 PART 4: Common Operations

### Restart Services

```bash
cd /app/nova-be

# Restart all
doppler run --project homix --config prd -- docker compose -f docker-compose.production.yml restart

# Restart API only
docker compose -f docker-compose.production.yml restart api
```

### Update Application (Redeploy)

```bash
cd /app/nova-be

# Pull latest code
git pull origin main

# Rebuild image
docker build -t registry.digitalocean.com/homix-registry/nova-be:latest -f Dockerfile .

# Stop and remove old containers
doppler run --project homix --config prd -- docker compose -f docker-compose.production.yml down

# Start with new image
doppler run --project homix --config prd -- docker compose -f docker-compose.production.yml up -d

# Clean up old images
docker image prune -af
```

### View Real-time Logs

```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# API only
docker compose -f docker-compose.production.yml logs -f api

# Last 100 lines
docker compose -f docker-compose.production.yml logs --tail=100 api
```

### Database Backup

```bash
# Backup database
docker exec nova-postgres pg_dump -U postgres nova_db > backup_$(date +%Y%m%d).sql

# Restore database
docker exec -i nova-postgres psql -U postgres nova_db < backup_20260203.sql
```

### Stop Services

```bash
# Stop all services
docker compose -f docker-compose.production.yml stop

# Stop and remove containers
docker compose -f docker-compose.production.yml down

# Stop and remove including volumes (⚠️ deletes database!)
docker compose -f docker-compose.production.yml down -v
```

---

## 🐛 PART 5: Troubleshooting

### Issue: Container fails to start

```bash
# Check logs
docker logs nova-api

# Common causes:
# 1. Doppler secrets not loaded
doppler secrets --project homix --config prd

# 2. Database not ready
docker ps  # Check if postgres is healthy

# 3. Port already in use
netstat -tuln | grep 4000
```

### Issue: Cannot connect to database

```bash
# Check database container
docker ps | grep postgres

# Check database logs
docker logs nova-postgres

# Test database connection
docker exec -it nova-postgres psql -U postgres -d nova_db
```

### Issue: "Cannot find module dist/main"

```bash
# Verify dist folder exists in container
docker exec -it nova-api ls -la /usr/src/app/dist

# If missing, rebuild image:
docker build -t registry.digitalocean.com/homix-registry/nova-be:latest -f Dockerfile .
doppler run --project homix --config prd -- docker compose -f docker-compose.production.yml up -d --force-recreate
```

### Issue: Migration fails

```bash
# Run migration manually
docker exec -it nova-api npx drizzle-kit push

# Check migration status
docker exec -it nova-postgres psql -U postgres -d nova_db -c "SELECT * FROM drizzle_migrations;"
```

---

## 📊 PART 6: Monitoring

### Check Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -af
```

### Check Application Health

```bash
# Create a simple health check script
cat > /app/nova-be/health-check.sh << 'EOF'
#!/bin/bash
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000)
if [ $STATUS -eq 200 ]; then
  echo "✅ Application is healthy (HTTP $STATUS)"
else
  echo "❌ Application is down (HTTP $STATUS)"
fi
EOF

chmod +x /app/nova-be/health-check.sh

# Run health check
./health-check.sh
```

---

## 🔐 PART 7: Security Notes

### Doppler Service Token

```bash
# Create service token at: https://dashboard.doppler.com
# Permissions: Read-only for config 'prd'

# Use service token instead of personal login
doppler configure set token dp.st.xxx...
```

### SSH Key (for CI/CD later)

```bash
# Generate SSH key for GitHub Actions
ssh-keygen -t ed25519 -C "github-actions-nova" -f ~/.ssh/github-actions-nova

# Add public key to authorized_keys
cat ~/.ssh/github-actions-nova.pub >> ~/.ssh/authorized_keys

# Copy private key for GitHub Secrets
cat ~/.ssh/github-actions-nova
```

---

## ✅ Quick Reference

### Essential Commands

```bash
# Deploy
cd /app/nova-be
doppler run --project homix --config prd -- docker compose -f docker-compose.production.yml up -d

# Logs
docker compose -f docker-compose.production.yml logs -f api

# Restart
doppler run --project homix --config prd -- docker compose -f docker-compose.production.yml restart

# Stop
docker compose -f docker-compose.production.yml down

# Update
git pull origin main && docker build -t registry.digitalocean.com/homix-registry/nova-be:latest . && \
doppler run --project homix --config prd -- docker compose -f docker-compose.production.yml up -d --force-recreate
```

### Environment Variables (from Doppler)

```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres:xxx@postgres:5432/nova_db
JWT_SECRET=xxx
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5000
ALLOWED_CORS_ORIGINS=http://localhost:5000
POSTGRES_USER=postgres
POSTGRES_PASSWORD=xxx
POSTGRES_DB=nova_db
POSTGRES_PORT=5432
DO_REGISTRY=registry.digitalocean.com/homix-registry
```

---

## 🎯 Summary

**Setup:** One-time VPS preparation (Docker, Doppler, directories)  
**Deploy:** Build image → Run with docker-compose + Doppler  
**Monitor:** Check logs, stats, health  
**Update:** Pull code → Rebuild → Redeploy

**Next Steps:** Setup automated CI/CD with GitHub Actions (see DEPLOYMENT_GUIDE.md)

---

**Last Updated:** February 3, 2026
