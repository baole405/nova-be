# 🔍 NOVA Backend Deployment - Pre-Implementation Checklist

**Date:** February 2, 2026  
**Project:** NOVA Backend (NestJS + Drizzle ORM)  
**Target:** DigitalOcean VPS Deployment with Docker + Doppler

---

## ✅ Confirmed Information

- **VPS IP:** `167.71.210.47`
- **Doppler Project:** `homix`
- **Database ORM:** Drizzle (NOT Prisma - guide uses Prisma)
- **Current Status:** Backend running on VPS with Docker Compose

---

## ❓ Information Required from User

### 1. DigitalOcean Container Registry

**Status:** ❌ Chưa tạo

**Questions:**

- Bạn muốn tên registry là gì? (ví dụ: `nova-registry`, `homix-registry`)
- Confirm region: Singapore (sgp1) hay US East (nyc3)?

**Action Required:**

- [ ] User tạo DO Container Registry qua dashboard
- [ ] Cung cấp registry name cho workflow setup

---

### 2. GitHub Repository Details

**Current repo:** `baole405/nova-be` (branch: `main`)

**Questions:**

- Có GitHub Actions đã chạy chưa? (check tab Actions)
- Có cần tạo workflows mới hay update workflows hiện có?

**Action Required:**

- [ ] Check file `.github/workflows/deploy.yml` hiện tại
- [ ] Xác định có giữ workflow cũ hay tạo mới theo guide

---

### 3. Drizzle ORM Adaptations

**Guide sử dụng Prisma, project sử dụng Drizzle**

**Differences:**
| Aspect | Prisma (Guide) | Drizzle (Project) |
|--------|----------------|-------------------|
| Migration command | `npx prisma migrate deploy` | `npm run db:push` hoặc custom |
| Client generation | `npx prisma generate` | Không cần (auto-generated) |
| Schema file | `prisma/schema.prisma` | `src/database/schema/*` |
| Dependencies | `@prisma/client`, `prisma` | `drizzle-orm`, `drizzle-kit` |

**Questions:**

- Migration strategy trong production? (`db:push` hay migration files?)
- Command để seed database (nếu cần)?

**Action Required:**

- [ ] Confirm migration command for docker-compose
- [ ] Update dockerfile to remove Prisma-specific steps

---

### 4. Doppler Secrets Configuration

**Project:** `homix`  
**Environments:** Development, Staging, Production

**Questions:**

- Dùng config nào cho production? (`prd`?)
- Secrets hiện tại có gì rồi? (screenshot Doppler dashboard)

**Required Secrets for Backend:**

```bash
# Application
NODE_ENV=production
PORT=4000  # hoặc 8080?
FRONTEND_URL=<will-add-after-FE-deploy>

# Database (PostgreSQL in Docker)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/nova_db?schema=public

# JWT (nếu có)
JWT_SECRET=<generate-random-32-chars>

# CORS
ALLOWED_CORS_ORIGINS=http://localhost:5000,<vercel-url-sau-này>
```

**Action Required:**

- [ ] User add secrets vào Doppler config `prd`
- [ ] Generate Doppler Service Token (read-only)

---

### 5. SSH Key for GitHub Actions

**Current setup:** Có SSH key `nova_key` đã dùng cho manual SSH

**Questions:**

- Tạo SSH key mới cho CI/CD hay dùng existing?
- Nếu tạo mới: tên gì? (`github-actions-key`?)

**Action Required:**

- [ ] Generate new SSH key: `ssh-keygen -t ed25519 -C "github-actions-ci" -f ~/.ssh/github-actions-nova`
- [ ] Add public key vào VPS: `ssh-copy-id -i ~/.ssh/github-actions-nova.pub root@167.71.210.47`
- [ ] Copy private key content để paste vào GitHub Secrets

---

### 6. Docker Configuration Adaptation

**Current setup:**

- `docker-compose.yml` đang chạy
- `Dockerfile` có rồi

**Questions:**

- Keep existing Dockerfile hay dùng template từ guide?
- Port mapping hiện tại: `4000:4000` - có đổi sang `8080:8080` không?

**Proposed Changes:**

```yaml
# docker-compose.production.yml (new file)
services:
  backend:
    image: registry.digitalocean.com/<REGISTRY_NAME>/nova-be:latest
    ports:
      - "${PORT}:${PORT}" # Dynamic port from Doppler
    environment:
      - DATABASE_URL=${DATABASE_URL}
    command: sh -c "npm run db:push && node dist/main" # Drizzle migration
```

**Action Required:**

- [ ] Confirm port strategy (keep 4000 or change to 8080)
- [ ] Review and approve docker-compose.production.yml

---

### 7. GitHub Actions Secrets

**Required Secrets (5 items):**

| Secret Name           | Value                   | Source                                 |
| --------------------- | ----------------------- | -------------------------------------- |
| `DO_ACCESS_TOKEN`     | `dop_v1_...`            | DigitalOcean → API → Tokens → Generate |
| `DO_REGISTRY_NAME`    | `<your-registry-name>`  | DO Container Registry name             |
| `DO_DROPLET_HOST`     | `167.71.210.47`         | ✅ Confirmed                           |
| `DO_DROPLET_USERNAME` | `root`                  | ✅ Confirmed                           |
| `DO_SSH_PRIVATE_KEY`  | `-----BEGIN OPENSSH...` | SSH key content                        |

**Action Required:**

- [ ] User tạo DO Access Token (if not exist)
- [ ] User generate SSH key và copy private key
- [ ] Add 5 secrets vào GitHub repo settings

---

### 8. VPS Current State

**Questions:**

- VPS có Docker + Docker Compose rồi? ✅ (từ hình: containers đang chạy)
- VPS có Doppler CLI chưa? ❓
- Firewall rules: ports nào đã mở? (22, 80, 443, 4000/8080?)

**Action Required:**

- [ ] Install Doppler CLI trên VPS (nếu chưa)
- [ ] Check firewall: `ufw status`
- [ ] Authenticate Doppler: `doppler login`

---

## 🎯 Proposed Implementation Flow

### Phase 1: Setup Infrastructure (User Tasks)

1. ✅ VPS already running
2. ❓ Create DO Container Registry
3. ❓ Install Doppler CLI on VPS (if not installed)
4. ❓ Generate SSH key for GitHub Actions
5. ❓ Add secrets to Doppler `prd` config

### Phase 2: Code Preparation (Agent Tasks)

1. Create `docker-compose.production.yml` (adapted for Drizzle)
2. Update/create Dockerfile (remove Prisma, add Drizzle)
3. Create `.github/workflows/deploy-production.yml`
4. Update `package.json` if needed

### Phase 3: GitHub Configuration (User Tasks)

1. Add 5 GitHub Secrets
2. Push code to trigger workflow

### Phase 4: Verification

1. Check GitHub Actions run
2. Verify deployment on VPS
3. Test API endpoints

---

## 📋 Quick Actions for User

### Action 1: Create DigitalOcean Container Registry

```
1. Go to: https://cloud.digitalocean.com/registries
2. Click "Create Registry"
3. Choose:
   - Name: nova-registry (or homix-registry)
   - Region: Singapore (sgp1) - gần VPS hơn
   - Plan: Starter ($5/month)
4. Click "Create Registry"
5. Copy registry name → paste vào đây
```

### Action 2: Install Doppler CLI on VPS (if needed)

```bash
ssh root@167.71.210.47

# Check if Doppler installed
doppler --version

# If not, install:
curl -sLf 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list
apt update && apt install doppler

# Authenticate
doppler login
```

### Action 3: Generate SSH Key for GitHub Actions

```bash
# On local machine
ssh-keygen -t ed25519 -C "github-actions-nova" -f ~/.ssh/github-actions-nova

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/github-actions-nova.pub root@167.71.210.47

# Test connection
ssh -i ~/.ssh/github-actions-nova root@167.71.210.47

# Copy private key (for GitHub Secret)
cat ~/.ssh/github-actions-nova
# Copy toàn bộ output (từ -----BEGIN đến -----END)
```

### Action 4: Add Doppler Secrets

```
1. Go to: https://dashboard.doppler.com/workplace/<workplace>/projects/homix
2. Select environment: Production
3. Select config: prd
4. Add secrets:
   - NODE_ENV=production
   - PORT=4000
   - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/nova_db
   - FRONTEND_URL=http://localhost:5000
   - ALLOWED_CORS_ORIGINS=http://localhost:5000
5. Generate Service Token:
   - Click "Access" → "Service Tokens"
   - Create token cho config "prd"
   - Copy token (sẽ dùng cho VPS)
```

### Action 5: Create DigitalOcean Access Token

```
1. Go to: https://cloud.digitalocean.com/account/api/tokens
2. Click "Generate New Token"
3. Name: github-actions-nova-be
4. Scopes:
   - Read ✅
   - Write ✅
5. Click "Generate Token"
6. Copy token (bắt đầu với dop_v1_...)
```

---

## ⚠️ Điểm khác biệt so với Guide

### 1. **Drizzle thay vì Prisma**

- Không cần `prisma generate`
- Migration command khác: `npm run db:push` thay vì `prisma migrate deploy`
- Package dependencies khác

### 2. **Port hiện tại: 4000 (guide dùng 8080)**

- Có thể giữ 4000 hoặc đổi sang 8080
- Cần consistent giữa Doppler PORT và docker-compose

### 3. **Project đang chạy rồi**

- Không cần setup từ đầu
- Focus vào CI/CD automation
- Zero-downtime deployment strategy

---

## 🚦 Decision Points

**User cần quyết định:**

1. **Registry name:** `nova-registry` hay `homix-registry`?
2. **Port strategy:** Giữ `4000` hay đổi sang `8080`?
3. **Migration command:** `npm run db:push` hay có script khác?
4. **Workflow strategy:** Tạo mới hay merge với workflow hiện tại?

---

## 📸 Screenshots Needed

**Để verify trước khi implement, tôi cần:**

1. ✅ VPS IP (có rồi: 167.71.210.47)
2. ✅ Doppler project name (có rồi: homix)
3. ❓ Screenshot Doppler dashboard với configs hiện tại
4. ❓ Screenshot GitHub Actions tab (nếu có workflows)
5. ❓ Output của `docker ps` trên VPS (verify containers)
6. ❓ DO Container Registry sau khi tạo xong

---

## ✅ Ready to Proceed When...

- [ ] DO Container Registry created (name confirmed)
- [ ] Doppler CLI installed on VPS
- [ ] Doppler secrets added to `prd` config
- [ ] SSH key generated and added to VPS
- [ ] DO Access Token generated
- [ ] Port strategy confirmed (4000 vs 8080)
- [ ] Migration command confirmed for Drizzle

**Sau khi confirm xong, tôi sẽ:**

1. Create adapted config files (Drizzle-compatible)
2. Create GitHub Actions workflows
3. Guide setup GitHub Secrets
4. Test deployment flow

---

**Gửi checklist này sang AI-Agent khác để xin feedback về Drizzle adaptations!** 🚀
