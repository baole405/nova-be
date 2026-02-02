# 🔧 NOVA Backend - Fix MODULE_NOT_FOUND Error in GitHub Actions

**Error:** `Error: Cannot find module '/usr/src/app/dist/main'`  
**Context:** Docker container fails to start in GitHub Actions workflow  
**Similar Issue:** WDP301 Backend đã gặp và fix successfully

---

## 🎯 Root Causes & Solutions

### **Issue 1: Drizzle ORM in devDependencies** ⚠️

**Symptom:**
```
Error: Cannot find module 'drizzle-orm'
MODULE_NOT_FOUND
```

**Root Cause:** 
- `drizzle-orm` và `drizzle-kit` ở devDependencies
- Production Docker image không có devDependencies

**✅ Solution - Update package.json:**

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "drizzle-orm": "^0.30.0",        // ← MUST be in dependencies
    "drizzle-kit": "^0.20.0",        // ← MUST be in dependencies
    "postgres": "^3.4.0",             // ← PostgreSQL driver
    // ... other dependencies
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    // ... KHÔNG để drizzle ở đây
  }
}
```

**Command to fix:**
```bash
npm install --save drizzle-orm drizzle-kit postgres
npm uninstall --save-dev drizzle-orm drizzle-kit
```

---

### **Issue 2: Build Stage Fails Silently** 🏗️

**Symptom:**
- Container starts but `dist/main` không tồn tại
- No build errors shown

**Root Cause:**
- `npm run build` fails nhưng Docker không catch error
- TypeScript compilation issues

**✅ Solution - Check Dockerfile build stage:**

```dockerfile
# Stage 2: Build application
FROM node:lts-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .

# Ensure build succeeds
RUN npm run build && ls -la dist/

# For Drizzle: NO need for generate step
# RUN npx prisma generate  ← DELETE this if exists
```

**Verify build locally:**
```bash
npm run build
ls -la dist/
# Should see: dist/main.js
```

---

### **Issue 3: GitHub Environment Variables Conflict** 🔐

**Symptom:**
```
Error: Secret name 'GITHUB_CLIENT_ID' cannot start with GITHUB_
```

**Root Cause:**
- GitHub Actions reserves `GITHUB_*` prefix
- Doppler also reserves this prefix

**✅ Solution - Rename environment variables:**

**In GitHub Actions workflow:**
```yaml
# .github/workflows/test-build-docker.yml
- name: Run Docker container
  run: |
    docker run -d --name test-container -p 4000:4000 \
      -e DATABASE_URL="postgresql://test:test@postgres:5432/testdb" \
      -e JWT_SECRET="test-secret" \
      -e GH_CLIENT_ID="test-id" \              # NOT GITHUB_CLIENT_ID
      -e GH_CLIENT_SECRET="test-secret" \      # NOT GITHUB_CLIENT_SECRET
      test-image:latest
```

**In application code (strategies/github.strategy.ts):**
```typescript
constructor(private configService: ConfigService) {
  super({
    clientID: configService.get<string>('GH_CLIENT_ID'),        // NOT GITHUB_CLIENT_ID
    clientSecret: configService.get<string>('GH_CLIENT_SECRET'), // NOT GITHUB_CLIENT_SECRET
    callbackURL: configService.get<string>('GH_CALLBACK_URL'),
  });
}
```

**In Doppler secrets:**
```
GH_CLIENT_ID=<github-oauth-id>
GH_CLIENT_SECRET=<github-oauth-secret>
GH_CALLBACK_URL=http://167.71.210.47:4000/auth/github/callback
```

---

### **Issue 4: Port Mismatch** 🔌

**Symptom:**
- Workflow checks `http://localhost:3000/` but app runs on different port

**Root Cause:**
- NOVA app listens on port 4000
- GitHub Actions checks port 3000

**✅ Solution - Update workflow to match app port:**

```yaml
# .github/workflows/test-build-docker.yml
- name: Run Docker container
  run: |
    docker run -d --name test-container -p 4000:4000 \  # ← Change 3000 to 4000
      --add-host=host.docker.internal:host-gateway \
      -e PORT=4000 \                                      # ← Add PORT env
      -e DATABASE_URL="postgresql://test:test@host.docker.internal:5432/testdb" \
      test-image:latest

- name: Wait for application
  run: |
    for i in {1..30}; do
      if curl -s http://localhost:4000/ > /dev/null 2>&1; then  # ← Change to 4000
        echo "✓ Application is ready"
        exit 0
      fi
      sleep 1
    done
    docker logs test-container
    exit 1
```

---

### **Issue 5: Missing dist Directory Copy** 📦

**Symptom:**
- Build succeeds but production image missing dist/

**Root Cause:**
- Dockerfile production stage not copying dist correctly

**✅ Solution - Verify Dockerfile production stage:**

```dockerfile
# Stage 3: Production image
FROM node:lts-alpine AS production
WORKDIR /usr/src/app
RUN apk add --no-cache openssl

COPY package*.json ./
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist              # ← CRITICAL
COPY --from=build /usr/src/app/drizzle ./drizzle        # ← For migrations

# Verify files exist
RUN ls -la dist/

CMD ["node", "dist/main"]
```

---

## 🔍 Debugging Checklist for AI Agent

### **Step 1: Check package.json**
```bash
# Run in NOVA project:
cat package.json | grep -A 10 '"dependencies"'
cat package.json | grep -A 10 '"devDependencies"'
```

**Expected:**
- ✅ `drizzle-orm` in dependencies
- ✅ `drizzle-kit` in dependencies
- ✅ `postgres` in dependencies
- ❌ NO drizzle packages in devDependencies

### **Step 2: Check Dockerfile**
```bash
cat Dockerfile | grep -E "RUN npm|COPY.*dist"
```

**Expected:**
- ✅ `RUN npm run build` in build stage
- ✅ `COPY --from=build /usr/src/app/dist ./dist` in production stage
- ❌ NO `npx prisma generate` (NOVA uses Drizzle, not Prisma)

### **Step 3: Check GitHub Actions Workflow**
```bash
cat .github/workflows/test-build-docker.yml | grep -E "docker run|PORT|localhost"
```

**Expected:**
- ✅ Port 4000 (not 3000)
- ✅ `GH_*` environment variables (not `GITHUB_*`)
- ✅ Correct DATABASE_URL

### **Step 4: Verify Local Build**
```bash
# Test build locally
npm install
npm run build
ls -la dist/
docker build -t test-nova -f Dockerfile .
docker run -p 4000:4000 -e DATABASE_URL="postgresql://test:test@localhost:5432/testdb" test-nova
```

---

## ✅ Quick Fix Commands for NOVA

### **Fix 1: Move Drizzle to dependencies**
```bash
npm install --save drizzle-orm drizzle-kit postgres
npm uninstall --save-dev drizzle-orm drizzle-kit
git add package.json package-lock.json
git commit -m "fix: move drizzle packages to dependencies"
```

### **Fix 2: Update GitHub Actions workflow**
```bash
# Edit .github/workflows/test-build-docker.yml
# Replace all:
#   - localhost:3000 → localhost:4000
#   - GITHUB_CLIENT_ID → GH_CLIENT_ID
#   - GITHUB_CLIENT_SECRET → GH_CLIENT_SECRET
#   - Add: -e PORT=4000

git add .github/workflows/test-build-docker.yml
git commit -m "fix: update workflow port and env vars"
```

### **Fix 3: Update OAuth strategies**
```bash
# Edit src/modules/auth/strategies/*.strategy.ts
# Replace:
#   - configService.get('GITHUB_CLIENT_ID') → configService.get('GH_CLIENT_ID')
#   - configService.get('GITHUB_CLIENT_SECRET') → configService.get('GH_CLIENT_SECRET')

git add src/modules/auth/strategies/
git commit -m "fix: rename GitHub env vars to avoid conflicts"
```

### **Fix 4: Update Doppler secrets**
```
1. Go to: https://dashboard.doppler.com
2. Project: homix → Config: prd
3. Rename secrets:
   GITHUB_CLIENT_ID → GH_CLIENT_ID
   GITHUB_CLIENT_SECRET → GH_CLIENT_SECRET
   GITHUB_CALLBACK_URL → GH_CALLBACK_URL
```

---

## 🎯 Expected Results After Fixes

### **GitHub Actions - test-build-docker.yml:**
```
✓ Checkout code
✓ Set up Docker Buildx
✓ Build Docker image
✓ Run Docker container
✓ Wait for application - ✓ Application is ready after 5 seconds
✓ Test health endpoint - 200 OK
```

### **Container logs should show:**
```
[Nest] INFO [NestFactory] Starting Nest application...
[Nest] INFO [InstanceLoader] AppModule dependencies initialized
[Nest] INFO [RoutesResolver] Mapped {/health, GET} route
[Nest] INFO [NestApplication] Nest application successfully started
[Nest] INFO Listening on port 4000
```

---

## 📋 AI Agent Action Plan

**For NOVA Backend AI Agent:**

```markdown
Tôi thấy error MODULE_NOT_FOUND trong GitHub Actions workflow.
Hãy thực hiện các bước sau theo TROUBLESHOOTING_NOVA_MODULE_NOT_FOUND.md:

1. **Check package.json:**
   - Drizzle packages phải ở dependencies (NOT devDependencies)
   - Run: npm install --save drizzle-orm drizzle-kit postgres

2. **Update GitHub Actions workflow:**
   - File: .github/workflows/test-build-docker.yml
   - Change port 3000 → 4000 ở tất cả chỗ
   - Change GITHUB_* → GH_* environment variables
   - Add -e PORT=4000

3. **Update OAuth strategies:**
   - Files: src/modules/auth/strategies/*.strategy.ts
   - Replace GITHUB_CLIENT_ID → GH_CLIENT_ID
   - Replace GITHUB_CLIENT_SECRET → GH_CLIENT_SECRET

4. **Verify Dockerfile:**
   - Ensure "COPY --from=build /usr/src/app/dist ./dist" exists
   - NO "npx prisma generate" (we use Drizzle)

5. **Test locally before pushing:**
   - npm run build && ls dist/
   - docker build -t test .
   - docker run -p 4000:4000 test

**Reference:** 
- DEPLOYMENT_GUIDE.md - Section "Drizzle ORM Variant"
- TROUBLESHOOTING_NOVA_MODULE_NOT_FOUND.md (this file)
```

---

## 🔗 Related Files to Check

| File | What to Check |
|------|--------------|
| `package.json` | drizzle-orm in dependencies |
| `Dockerfile` | Build stage + COPY dist |
| `.github/workflows/test-build-docker.yml` | Port 4000, GH_* vars |
| `src/modules/auth/strategies/*.strategy.ts` | configService.get('GH_CLIENT_ID') |
| `docker-compose.yml` | Port mapping 4000:4000 |

---

## 💡 Pro Tips

1. **Always test Docker build locally first:**
   ```bash
   docker build -t test-nova .
   docker run -p 4000:4000 --env-file .env.test test-nova
   ```

2. **Check container logs immediately:**
   ```bash
   docker logs test-container
   ```

3. **Verify dependencies after install:**
   ```bash
   npm list drizzle-orm drizzle-kit postgres
   ```

4. **Use DEPLOYMENT_GUIDE.md Drizzle section** - đã cover hết các issues này!

---

## ✅ Success Criteria

- [ ] GitHub Actions workflow passes
- [ ] Application starts within 10 seconds
- [ ] Health endpoint returns 200 OK
- [ ] No MODULE_NOT_FOUND errors
- [ ] Container logs show "Listening on port 4000"

---

**Reference Project:** WDP301 Backend (đã fix successfully tất cả issues này)  
**Date:** February 2, 2026  
**Status:** TESTED & WORKING

---

**END OF TROUBLESHOOTING GUIDE**
