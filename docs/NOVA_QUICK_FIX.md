# ⚡ NOVA Backend - Quick Fix Commands

**Error:** `Cannot find module '/usr/src/app/dist/main'`  
**Date:** February 2, 2026  
**Status:** EXACT FIX NEEDED NOW

---

## 🎯 2 Issues Found in Screenshot

1. ❌ **dist/main not found** - Build fails or copy fails
2. ❌ **Port 3000 check** but app runs on 4000

---

## ✅ EXACT FIX - Run These Commands

### **Step 1: Check Current Dockerfile**

```bash
# In NOVA project root
cat Dockerfile
```

**Cần tìm:**
- ✅ `RUN npm run build` ở build stage
- ✅ `COPY --from=build /usr/src/app/dist ./dist` ở production stage
- ❌ KHÔNG có `npx prisma generate` (NOVA dùng Drizzle)

### **Step 2: Fix Dockerfile if Wrong**

**REPLACE Dockerfile với template này:**

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS install
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build application
FROM node:20-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .

# Build and verify
RUN npm run build
RUN ls -la dist/ && test -f dist/main.js

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /usr/src/app
RUN apk add --no-cache openssl curl

COPY package*.json ./
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/drizzle ./drizzle

# Verify dist exists
RUN ls -la dist/ && test -f dist/main.js

EXPOSE 4000
CMD ["node", "dist/main.js"]
```

### **Step 3: Fix GitHub Actions Workflow**

```bash
# Edit file: .github/workflows/test-build-docker.yml
```

**FIND and REPLACE:**

```yaml
# OLD (line ~40-50):
- name: Run Docker container
  run: |
    docker run -d --name test-container -p 3000:3000 \
      # ...
      
- name: Wait for application
  run: |
    for i in {1..30}; do
      if curl -s http://localhost:3000/ > /dev/null 2>&1; then

# NEW:
- name: Run Docker container
  run: |
    docker run -d --name test-container -p 4000:4000 \
      --add-host=host.docker.internal:host-gateway \
      -e NODE_ENV=test \
      -e PORT=4000 \
      -e DATABASE_URL="postgresql://test:test@host.docker.internal:5432/testdb?schema=public" \
      -e JWT_SECRET="test-secret-key-12345678901234567890" \
      -e GH_CLIENT_ID="test-github-client-id" \
      -e GH_CLIENT_SECRET="test-github-client-secret" \
      -e GH_CALLBACK_URL="http://localhost:4000/auth/github/callback" \
      test-image:latest
      
- name: Wait for application
  run: |
    echo "Waiting for application to be ready..."
    for i in {1..30}; do
      if curl -s http://localhost:4000/ > /dev/null 2>&1; then
        echo "✓ Application is ready after ${i} seconds"
        break
      fi
      if [ $i -eq 30 ]; then
        echo "✗ Application failed to start within 30 seconds"
        echo "Container logs:"
        docker logs test-container
        docker exec test-container ls -la dist/ || echo "Cannot access container"
        exit 1
      fi
      sleep 1
    done
```

### **Step 4: Check package.json**

```bash
# In NOVA project
cat package.json | grep -A 5 '"dependencies"'
cat package.json | grep -A 5 '"scripts"'
```

**MUST HAVE:**

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main"
  },
  "dependencies": {
    "@nestjs/common": "^10.x.x",
    "@nestjs/core": "^10.x.x",
    "drizzle-orm": "^0.30.0",
    "drizzle-kit": "^0.20.0",
    "postgres": "^3.4.0"
  }
}
```

**If drizzle-orm in devDependencies:**

```bash
npm install --save drizzle-orm drizzle-kit postgres
npm uninstall --save-dev drizzle-orm drizzle-kit
```

### **Step 5: Test Build Locally**

```bash
# Clean build
rm -rf dist/ node_modules/
npm install
npm run build

# Verify dist/main.js exists
ls -la dist/
ls -la dist/main.js  # Should exist!

# Test Docker build
docker build -t test-nova -f Dockerfile .

# Test run
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://test:test@localhost:5432/testdb" \
  -e PORT=4000 \
  -e JWT_SECRET="test" \
  test-nova

# In another terminal, test endpoint
curl http://localhost:4000/
```

### **Step 6: Commit and Push**

```bash
git add Dockerfile .github/workflows/test-build-docker.yml package.json
git commit -m "fix: resolve MODULE_NOT_FOUND and port mismatch in CI"
git push origin main
```

---

## 🔍 Debugging If Still Fails

### **Check Docker build logs:**

```bash
docker build -t test-nova -f Dockerfile . --progress=plain
```

**Look for:**
- ✅ Build stage completes: `RUN npm run build` success
- ✅ Files copied: `COPY --from=build /usr/src/app/dist ./dist`
- ✅ Verify step passes: `RUN ls -la dist/`

### **Check container contents:**

```bash
docker run --rm test-nova ls -la dist/
docker run --rm test-nova cat package.json | grep '"main"'
```

### **Check tsconfig.json:**

```bash
cat tsconfig.json | grep -A 5 '"outDir"'
```

**Should be:**
```json
{
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

---

## 📋 Checklist After Fix

- [ ] `npm run build` creates `dist/main.js` locally
- [ ] Dockerfile có `COPY --from=build .../dist ./dist`
- [ ] Workflow checks port **4000** not 3000
- [ ] drizzle-orm in **dependencies** not devDependencies
- [ ] Docker build completes without errors
- [ ] Container starts and listens on port 4000

---

## 🎯 Expected Success

**After fix, GitHub Actions should show:**

```
✓ Build Docker image
✓ Run Docker container
✓ Wait for application - ✓ Application is ready after 5 seconds
✓ Test endpoint - 200 OK
```

**Container logs:**
```
[Nest] Starting Nest application...
[Nest] AppModule dependencies initialized
[Nest] Nest application successfully started
[Nest] Listening on port 4000
```

---

## ⚠️ Common Mistakes

1. ❌ `COPY dist ./dist` instead of `COPY --from=build /usr/src/app/dist ./dist`
2. ❌ Port 3000 in workflow but PORT=4000 in app
3. ❌ Missing `npm run build` in Dockerfile
4. ❌ drizzle packages in devDependencies
5. ❌ tsconfig outDir wrong path

---

**If error persists, check:**
- [ ] main.ts entry point exists: `src/main.ts`
- [ ] package.json "main" points to correct file
- [ ] nest-cli.json has correct sourceRoot/entryFile

---

**COPY THIS TO NOVA AI AGENT NOW!** 🚀
