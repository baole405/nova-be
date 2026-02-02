# 🚀 Complete Deployment Guide - NestJS to DigitalOcean VPS

**Last Updated:** February 2, 2026  
**Template Version:** 1.0  
**Tested On:** WDP301 Backend Project

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Drizzle ORM Variant](#drizzle-orm-variant)
6. [File Templates](#file-templates)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide provides a **complete, production-ready deployment flow** for NestJS applications to DigitalOcean VPS with:

- ✅ Docker containerization
- ✅ Doppler secrets management
- ✅ PostgreSQL database with **Prisma ORM** or **Drizzle ORM**
- ✅ Automated CI/CD via GitHub Actions
- ✅ Zero-downtime deployments

**Architecture:**

```
Developer Push → GitHub Actions → Build Docker → Push to DO Registry → SSH to VPS → Deploy with Doppler
```

---

## 📦 Prerequisites

### 1. DigitalOcean Resources

**VPS Droplet:**

- OS: Ubuntu 24.04 LTS
- RAM: 2GB minimum
- SSH access configured
- Firewall: Ports 22, 80, 443, 8080 open

**Container Registry:**

- Created in DigitalOcean dashboard
- Name example: `doregistry1`

**API Token:**

- Generated with scopes: Container Registry (read/write), Droplet (read/write)

### 2. GitHub Repository

- Repository created
- Admin access for secrets configuration

### 3. Doppler Account

- Project created (e.g., `your-project-name`)
- Config created (e.g., `prd` for production)
- Service token generated (read-only)

### 4. Local Tools

- SSH key generated for CI/CD
- Git installed
- Docker installed (for local testing)

---

## 📁 Project Structure

```
your-project/
├── .github/
│   └── workflows/
│       ├── build-and-test.yml          # Run tests on PR/push
│       ├── test-build-docker.yml       # Docker build + test
│       └── deploy-production.yml       # Auto-deploy to VPS
├── prisma/
│   ├── schema.prisma                   # Database schema
│   └── migrations/                     # Migration files
├── src/
│   ├── main.ts                         # NestJS entry point
│   ├── swagger.ts                      # Swagger configuration
│   └── modules/                        # Application modules
├── dockerfile                          # Multi-stage Docker build
├── docker-compose.production.yml      # Production deployment config
├── package.json                        # Dependencies (Prisma in dependencies!)
├── tsconfig.json                       # TypeScript config
└── .env.example                        # Environment variables template
```

---

## 🔧 Step-by-Step Setup

### **PHASE 1: Local Development Setup**

#### 1.1 Clone & Install Dependencies

```bash
git clone <your-repo-url>
cd your-project
npm install
```

#### 1.2 Configure Prisma

**prisma/schema.prisma:**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String   @id @default(uuid()) @db.Uuid
  email         String   @unique
  password_hash String?
  full_name     String?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  @@map("User")
}
```

**Generate migration:**

```bash
npx prisma migrate dev --name init_structure
```

#### 1.3 Update package.json

**CRITICAL:** Move ORM packages to production dependencies:

```json
// For Prisma:
{
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "prisma": "^5.22.0"
  }
}

// For Drizzle:
{
  "dependencies": {
    "drizzle-orm": "^0.30.0",
    "drizzle-kit": "^0.20.0",
    "postgres": "^3.4.0"  // or pg driver
  }
}
```

---

### **PHASE 2: VPS Setup**

#### 2.1 SSH Access

```bash
# Generate SSH key for CI/CD
ssh-keygen -t ed25519 -C "github-actions-ci" -f github-actions-key

# Copy public key to VPS
ssh-copy-id -i github-actions-key.pub root@<VPS_IP>

# Test connection
ssh -i github-actions-key root@<VPS_IP>
```

#### 2.2 Install Docker on VPS

```bash
# On VPS
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify
docker --version
docker compose version
```

#### 2.3 Install Doppler CLI on VPS

```bash
# On VPS
curl -sLf 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] https://packages.doppler.com/public/cli/deb/debian any-version main" | tee /etc/apt/sources.list.d/doppler-cli.list
apt update && apt install doppler

# Authenticate
doppler login
```

#### 2.4 Setup Doppler on VPS

```bash
# On VPS
cd /app/be-repo  # Create this directory first
doppler setup --project <your-project> --config prd
doppler secrets
```

#### 2.5 Configure UFW Firewall

```bash
# On VPS
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 8080/tcp  # Application
ufw enable
ufw status
```

---

### **PHASE 3: Doppler Secrets Configuration**

#### 3.1 Create Doppler Secrets

Go to: `https://dashboard.doppler.com`

**Required secrets (20 minimum):**

```bash
# Application
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://your-frontend.com
ALLOWED_CORS_ORIGINS=https://your-frontend.com,http://localhost:3001

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/dbname?schema=public
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=your_db_name
POSTGRES_PORT=5432

# JWT
JWT_SECRET=<generate-random-32-chars>
JWT_EXPIRES_IN=7d

# OAuth GitHub (rename from GITHUB_* to avoid conflict)
GH_CLIENT_ID=<github-oauth-app-id>
GH_CLIENT_SECRET=<github-oauth-secret>
GH_CALLBACK_URL=http://<VPS_IP>:8080/auth/github/callback

# OAuth Jira
JIRA_CLIENT_ID=<jira-oauth-id>
JIRA_CLIENT_SECRET=<jira-oauth-secret>
JIRA_CALLBACK_URL=http://<VPS_IP>:8080/auth/jira/callback

# DigitalOcean
DO_REGISTRY=registry.digitalocean.com/your-registry
```

**⚠️ IMPORTANT:** Doppler reserves `GITHUB_*` prefix - use `GH_*` instead!

---

### **PHASE 4: Docker Configuration**

#### 4.1 Create dockerfile

**Key Points:**

- Multi-stage build (install → build → production)
- Prisma client generation in build stage
- No hardcoded EXPOSE (dynamic PORT from env)

```dockerfile
# Stage 1: Install dependencies
FROM node:lts-alpine AS install
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build application
FROM node:lts-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi
RUN npm run build

# Stage 3: Production image
FROM node:lts-alpine AS production
WORKDIR /usr/src/app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /usr/src/app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/dist ./dist

# App listens on PORT from environment variable (controlled by Doppler)
# No EXPOSE directive as port is dynamic (8080 in production)
CMD ["node", "dist/main"]
```

#### 4.2 Create docker-compose.production.yml

**Key Points:**

- Dynamic port mapping: `${PORT}:${PORT}` (NOT `${PORT}:3000`)
- Auto-migration on startup
- PostgreSQL with healthcheck

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: your-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - '${POSTGRES_PORT}:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}']
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: ${DO_REGISTRY}/your-repo:latest
    container_name: your-api
    restart: unless-stopped
    environment:
      NODE_ENV: ${NODE_ENV}
      PORT: ${PORT}
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?schema=public
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
      GH_CLIENT_ID: ${GH_CLIENT_ID}
      GH_CLIENT_SECRET: ${GH_CLIENT_SECRET}
      GH_CALLBACK_URL: ${GH_CALLBACK_URL}
      JIRA_CLIENT_ID: ${JIRA_CLIENT_ID}
      JIRA_CLIENT_SECRET: ${JIRA_CLIENT_SECRET}
      JIRA_CALLBACK_URL: ${JIRA_CALLBACK_URL}
      FRONTEND_URL: ${FRONTEND_URL}
    ports:
      - '${PORT}:${PORT}'
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app-network
    command: sh -c "npx prisma migrate deploy && node dist/main"

networks:
  app-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
```

---

### **PHASE 5: Swagger Configuration**

#### 5.1 Update src/swagger.ts

```typescript
import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export const getDocumentBuilder = () => {
  const builder = new DocumentBuilder()
    .setTitle('Your API Documentation')
    .setDescription('Comprehensive API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addServer(
      `http://localhost:${process.env.PORT ?? 3000}`,
      'Local development',
    );

  // Add production server if FRONTEND_URL is set
  if (process.env.FRONTEND_URL) {
    const productionUrl = process.env.FRONTEND_URL.includes('localhost')
      ? 'http://<VPS_IP>:8080'
      : 'http://<VPS_IP>:8080';
    builder.addServer(productionUrl, 'Production (DigitalOcean VPS)');
  }

  return builder.build();
};

export const swaggerUiOptions: SwaggerCustomOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
  },
  customSiteTitle: 'Your API Documentation',
};
```

---

### **PHASE 6: GitHub Actions CI/CD**

#### 6.1 Configure GitHub Secrets

Go to: `https://github.com/<your-org>/<your-repo>/settings/secrets/actions`

**Add 5 secrets:**

| Secret Name           | Value           | How to Get                      |
| --------------------- | --------------- | ------------------------------- |
| `DO_ACCESS_TOKEN`     | `dop_v1_...`    | DigitalOcean → API → Tokens     |
| `DO_REGISTRY_NAME`    | `your-registry` | Your DO registry name           |
| `DO_DROPLET_HOST`     | `<VPS_IP>`      | Your VPS IP address             |
| `DO_DROPLET_USERNAME` | `root`          | VPS username                    |
| `DO_SSH_PRIVATE_KEY`  | `-----BEGIN...` | Content of `github-actions-key` |

#### 6.2 Create Workflow: build-and-test.yml

```yaml
name: Build and Test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
```

#### 6.3 Create Workflow: test-build-docker.yml

```yaml
name: Test and Build Docker

on:
  push:
    branches: [main]
  pull_request:

jobs:
  docker-build-and-test:
    name: Build and Test Docker Image
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          load: true
          tags: test-image:latest

      - name: Run Docker container
        run: |
          docker run -d --name test-container -p 3000:3000 \
            --add-host=host.docker.internal:host-gateway \
            -e DATABASE_URL="postgresql://test:test@host.docker.internal:5432/testdb?schema=public" \
            -e JWT_SECRET="test-secret-key" \
            -e GH_CLIENT_ID="test-id" \
            -e GH_CLIENT_SECRET="test-secret" \
            -e GH_CALLBACK_URL="http://localhost:3000/auth/github/callback" \
            test-image:latest

      - name: Wait for application
        run: |
          for i in {1..30}; do
            if curl -s http://localhost:3000/ > /dev/null 2>&1; then
              echo "✓ Application ready"
              exit 0
            fi
            sleep 1
          done
          docker logs test-container
          exit 1
```

#### 6.4 Create Workflow: deploy-production.yml

```yaml
name: Deploy to Production

on:
  workflow_run:
    workflows: ['Test and Build Docker']
    types: [completed]
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: registry.digitalocean.com
  IMAGE_NAME: ${{ secrets.DO_REGISTRY_NAME }}/your-repo

jobs:
  build-and-push:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' || github.event_name == 'workflow_dispatch' }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DO_ACCESS_TOKEN }}

      - name: Log in to DO Container Registry
        run: doctl registry login --expiry-seconds 600

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

  deploy:
    name: Deploy to DigitalOcean Droplet
    needs: build-and-push
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Copy docker-compose to Droplet
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.DO_DROPLET_HOST }}
          username: ${{ secrets.DO_DROPLET_USERNAME }}
          key: ${{ secrets.DO_SSH_PRIVATE_KEY }}
          source: 'docker-compose.production.yml'
          target: '/app/your-repo'

      - name: Deploy to Droplet
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DO_DROPLET_HOST }}
          username: ${{ secrets.DO_DROPLET_USERNAME }}
          key: ${{ secrets.DO_SSH_PRIVATE_KEY }}
          script: |
            cd /app/your-repo
            echo ${{ secrets.DO_ACCESS_TOKEN }} | docker login registry.digitalocean.com -u ${{ secrets.DO_ACCESS_TOKEN }} --password-stdin
            docker compose -f docker-compose.production.yml pull
            doppler run --project <your-project> --config prd -- docker compose -f docker-compose.production.yml down
            doppler run --project <your-project> --config prd -- docker compose -f docker-compose.production.yml up -d
            docker image prune -af

      - name: Verify Deployment
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.DO_DROPLET_HOST }}
          username: ${{ secrets.DO_DROPLET_USERNAME }}
          key: ${{ secrets.DO_SSH_PRIVATE_KEY }}
          script: |
            cd /app/your-repo
            docker compose -f docker-compose.production.yml ps
```

---

### **PHASE 7: Code Adjustments**

#### 7.1 NestJS DTOs - Use camelCase

**IMPORTANT:** TypeScript/NestJS convention is camelCase, NOT snake_case!

```typescript
// ✅ CORRECT
export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string; // ← camelCase

  @ApiProperty({ example: 'SE123456', required: false })
  @IsOptional()
  studentId?: string; // ← camelCase
}

// In service, map to database snake_case:
const user = await this.prisma.user.create({
  data: {
    email: dto.email,
    full_name: dto.fullName, // ← Map camelCase to snake_case
    student_id: dto.studentId,
  },
});
```

#### 7.2 Fix OAuth Strategy Environment Variables

```typescript
// src/modules/auth/strategies/github.strategy.ts
constructor(private configService: ConfigService) {
  super({
    clientID: configService.get<string>('GH_CLIENT_ID'),        // NOT GITHUB_CLIENT_ID
    clientSecret: configService.get<string>('GH_CLIENT_SECRET'), // NOT GITHUB_CLIENT_SECRET
    callbackURL: configService.get<string>('GH_CALLBACK_URL'),
    scope: ['user:email', 'read:user'],
  });
}
```

---

## 🔄 Drizzle ORM Variant

**If your project uses Drizzle instead of Prisma**, follow these adjustments:

### **Key Differences:**

| Aspect            | Prisma                      | Drizzle                                                |
| ----------------- | --------------------------- | ------------------------------------------------------ |
| Schema file       | `prisma/schema.prisma`      | `src/db/schema.ts` or `drizzle/schema.ts`              |
| Generate command  | `npx prisma generate`       | Not needed (TypeScript-first)                          |
| Migration command | `npx prisma migrate deploy` | `npx drizzle-kit push:pg` or `npx drizzle-kit migrate` |
| Client import     | `@prisma/client`            | `drizzle-orm`                                          |
| Dependencies      | `@prisma/client`, `prisma`  | `drizzle-orm`, `drizzle-kit`, `postgres`               |

### **Drizzle: dockerfile Adjustments**

```dockerfile
# Stage 1: Install dependencies
FROM node:lts-alpine AS install
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Build application
FROM node:lts-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
# Drizzle doesn't need generate step - schema is TypeScript
RUN npm run build

# Stage 3: Production image
FROM node:lts-alpine AS production
WORKDIR /usr/src/app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
# Copy Drizzle schema and migrations
COPY --from=build /usr/src/app/drizzle ./drizzle
# OR if schema is in src: it's already bundled in dist

CMD ["node", "dist/main"]
```

### **Drizzle: docker-compose.production.yml Command**

```yaml
# Replace Prisma migration command with Drizzle:
command: sh -c "npx drizzle-kit push:pg --config=drizzle.config.ts && node dist/main"

# OR for manual migrations:
command: sh -c "npx drizzle-kit migrate && node dist/main"
```

### **Drizzle: package.json Dependencies**

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "drizzle-orm": "^0.30.0",
    "drizzle-kit": "^0.20.0",
    "postgres": "^3.4.0" // PostgreSQL driver
    // ... other dependencies
  },
  "devDependencies": {
    // Move drizzle-kit here if you prefer
    // But MUST keep drizzle-orm in dependencies
  }
}
```

### **Drizzle: Schema Example**

```typescript
// src/db/schema.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('User', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  fullName: varchar('full_name', { length: 255 }),
  studentId: varchar('student_id', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### **Drizzle: Database Connection**

```typescript
// src/db/drizzle.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleInit {
  public db: ReturnType<typeof drizzle>;
  private client: ReturnType<typeof postgres>;

  async onModuleInit() {
    this.client = postgres(process.env.DATABASE_URL);
    this.db = drizzle(this.client, { schema });
  }

  async onModuleDestroy() {
    await this.client.end();
  }
}
```

### **Drizzle: Service Usage**

```typescript
// src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(private drizzle: DrizzleService) {}

  async create(dto: RegisterDto) {
    const [user] = await this.drizzle.db
      .insert(users)
      .values({
        email: dto.email,
        passwordHash: hashedPassword,
        fullName: dto.fullName,
        studentId: dto.studentId,
      })
      .returning();

    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user;
  }
}
```

### **Drizzle: Migration Commands**

```bash
# Generate migration
npx drizzle-kit generate:pg

# Push schema to database (auto-migration)
npx drizzle-kit push:pg

# Apply migrations manually
npx drizzle-kit migrate

# Drizzle Studio (view data)
npx drizzle-kit studio
```

### **Drizzle: Config File**

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
} satisfies Config;
```

### **Drizzle: Dockerfile Copy Adjustments**

If using migrations folder:

```dockerfile
# In production stage
COPY --from=build /usr/src/app/drizzle/migrations ./drizzle/migrations
COPY drizzle.config.ts ./
```

### **Drizzle: GitHub Actions - No Changes Needed**

Drizzle works with the same CI/CD workflows! Just ensure:

- `drizzle-orm` in dependencies (not devDependencies)
- Migration command in docker-compose matches your approach

### **Drizzle: Summary Checklist**

For Drizzle projects, ensure:

- [ ] `drizzle-orm` in package.json dependencies
- [ ] `drizzle.config.ts` in project root
- [ ] Schema file at `src/db/schema.ts` or custom path
- [ ] Migration command in docker-compose: `npx drizzle-kit push:pg` or `migrate`
- [ ] Database connection service implemented
- [ ] Copy drizzle folder in dockerfile if using migrations

**Migration Strategy Choice:**

- **Push mode** (`push:pg`): Auto-migrate on startup (like Prisma)
- **Manual migrations** (`migrate`): Apply pre-generated migrations (safer for production)

---

## ✅ Verification Checklist

### **Pre-Deployment:**

- [ ] All Doppler secrets configured (20+ secrets)
- [ ] GitHub secrets added (5 secrets)
- [ ] SSH key added to VPS authorized_keys
- [ ] VPS firewall configured (ports 22, 80, 443, 8080)
- [ ] Doppler CLI authenticated on VPS
- [ ] Docker & Docker Compose installed on VPS
- [ ] DigitalOcean Container Registry created
- [ ] Prisma in package.json `dependencies` (NOT devDependencies)

### **Post-Deployment:**

```bash
# 1. Check containers running
ssh root@<VPS_IP>
cd /app/your-repo
docker compose -f docker-compose.production.yml ps

# 2. Check logs
docker compose -f docker-compose.production.yml logs -f api

# 3. Test health endpoint
curl http://localhost:8080/health
curl http://<VPS_IP>:8080/health

# 4. Verify database migration
docker exec -it your-postgres psql -U <db_user> -d <db_name>
SELECT * FROM _prisma_migrations;
\q

# 5. Test Swagger UI
# Open browser: http://<VPS_IP>:8080/api-docs
```

### **GitHub Actions:**

- [ ] "Test and Build Docker" workflow passes
- [ ] "Deploy to Production" workflow triggers automatically
- [ ] No failed jobs in Actions tab
- [ ] Application accessible on VPS_IP:8080

---

## 🔧 Troubleshooting

### **Issue: Port mismatch connection refused**

**Symptom:** `curl http://<VPS_IP>:8080/health` → Connection refused

**Causes:**

1. docker-compose port mapping wrong: `${PORT}:3000` instead of `${PORT}:${PORT}`
2. App listening on wrong port
3. Firewall blocking

**Solution:**

```yaml
# docker-compose.production.yml
ports:
  - '${PORT}:${PORT}' # MUST match both sides
```

### **Issue: Prisma CLI not found in production**

**Symptom:** `Error: Cannot find module 'prisma'`

**Cause:** Prisma in devDependencies

**Solution:**

```json
// package.json
"dependencies": {
  "@prisma/client": "^5.22.0",
  "prisma": "^5.22.0"  // MUST be in dependencies
}
```

### **Issue: Doppler GITHUB\_\* prefix conflict**

**Symptom:** `Secret name 'GITHUB_CLIENT_ID' cannot start with GITHUB_`

**Cause:** Doppler reserves GITHUB\_\* prefix

**Solution:** Rename all variables:

```
GITHUB_CLIENT_ID → GH_CLIENT_ID
GITHUB_CLIENT_SECRET → GH_CLIENT_SECRET
GITHUB_CALLBACK_URL → GH_CALLBACK_URL
```

### **Issue: Migrations not running**

**Cause:** Missing migration command in docker-compose

**Solution:**

```yaml
# For Prisma:
command: sh -c "npx prisma migrate deploy && node dist/main"

# For Drizzle:
command: sh -c "npx drizzle-kit push:pg && node dist/main"
# OR
command: sh -c "npx drizzle-kit migrate && node dist/main"
```

### **Issue: Drizzle schema not found in production**

**Symptom:** `Cannot find module './db/schema'` or `drizzle folder missing`

**Cause:** Schema/migrations not copied to production image

**Solution:**

```dockerfile
# In production stage of dockerfile
COPY --from=build /usr/src/app/drizzle ./drizzle
COPY drizzle.config.ts ./

# If schema is in src, it's already bundled in dist
# Otherwise copy manually:
COPY --from=build /usr/src/app/src/db ./src/db
```

### **Issue: Drizzle migration fails on startup**

**Symptom:** `Error: relation "User" does not exist`

**Cause:** Migration not applied or wrong connection string

**Solution:**

```bash
# On VPS, check DATABASE_URL
docker exec -it your-api env | grep DATABASE_URL

# Manually run migration
docker exec -it your-api npx drizzle-kit push:pg

# Check drizzle.config.ts uses DATABASE_URL
export default {
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
} satisfies Config;
```

---

## 📚 Quick Reference Commands

### **Local Development:**

```bash
# Install dependencies
npm install

# Prisma: Run migrations
npx prisma migrate dev

# Drizzle: Generate and push migrations
npx drizzle-kit generate:pg
npx drizzle-kit push:pg

# Start dev server
npm run start:dev

# Build Docker locally
docker build -t test-image -f dockerfile .

# Test Docker container
docker run -p 3000:3000 --env-file .env test-image
```

### **VPS Management:**

```bash
# SSH to VPS
ssh -i ~/.ssh/your-key root@<VPS_IP>

# Check Doppler secrets
doppler secrets --project <project> --config prd

# Manual deployment
cd /app/your-repo
git pull origin main
docker build -t registry.digitalocean.com/<registry>/repo:latest -f dockerfile .
docker push registry.digitalocean.com/<registry>/repo:latest
doppler run --project <project> --config prd -- docker compose -f docker-compose.production.yml up -d

# View logs
docker compose -f docker-compose.production.yml logs -f

# Restart services
doppler run --project <project> --config prd -- docker compose -f docker-compose.production.yml restart api

# Clean up
docker system prune -af
```

### **Debugging:**

```bash
# Check port mapping
docker compose -f docker-compose.production.yml ps

# Inspect container
docker exec -it your-api sh
env | grep PORT
netstat -tuln
exit

# Check database connection (PostgreSQL client)
docker exec -it your-postgres psql -U <user> -d <db>
\dt
\q

# For Drizzle: Check migrations applied
docker exec -it your-api npx drizzle-kit studio
# OR query directly
docker exec -it your-postgres psql -U <user> -d <db> -c "SELECT * FROM drizzle_migrations;"

# For Prisma: Check migrations
docker exec -it your-postgres psql -U <user> -d <db> -c "SELECT * FROM _prisma_migrations;"
```

---

## 🎯 Summary Checklist for New Project

**Copy these files from reference project:**

- [ ] `dockerfile`
- [ ] `docker-compose.production.yml`
- [ ] `.github/workflows/build-and-test.yml`
- [ ] `.github/workflows/test-build-docker.yml`
- [ ] `.github/workflows/deploy-production.yml`
- [ ] `src/swagger.ts` (update production URL)

**Update these values:**

- [ ] Replace `<VPS_IP>` with your VPS IP
- [ ] Replace `<your-registry>` with DO registry name
- [ ] Replace `<your-project>` with Doppler project name
- [ ] Replace `<your-repo>` with repository name
- [ ] Update container names in docker-compose
- [ ] Update Swagger server URLs
- [ ] **For Drizzle:** Update migration command in docker-compose (`push:pg` or `migrate`)

**Setup on platforms:**

- [ ] Create DigitalOcean Container Registry
- [ ] Create Doppler project + config
- [ ] Add 20+ Doppler secrets
- [ ] Add 5 GitHub Actions secrets
- [ ] Configure VPS (Docker, Doppler, SSH)

**For Drizzle projects specifically:**

- [ ] Move `drizzle-orm` to dependencies (NOT devDependencies)
- [ ] Create `drizzle.config.ts` in project root
- [ ] Update dockerfile to copy `drizzle` folder
- [ ] Update docker-compose command: `npx drizzle-kit push:pg && node dist/main`
- [ ] Ensure schema file path is correct in config

**Verification:**

- [ ] Push code → GitHub Actions runs
- [ ] Docker image builds successfully
- [ ] Deployment completes without errors
- [ ] Application accessible on VPS_IP:8080
- [ ] Database migrations applied (check `_prisma_migrations` or `drizzle_migrations` table)
- [ ] Swagger UI works with production server

---

## 📞 Support

If following this guide, provide AI agents with:

1. This entire document
2. Your specific values (VPS IP, registry name, etc.)
3. Any error messages from GitHub Actions logs

**Common AI prompts:**

- "Follow DEPLOYMENT_GUIDE.md to setup CI/CD for my NestJS project"
- "My VPS IP is X.X.X.X, Doppler project is Y, help setup deployment"
- "Review my workflow files against DEPLOYMENT_GUIDE.md best practices"
- **For Drizzle:** "I'm using Drizzle ORM - follow the Drizzle variant section in DEPLOYMENT_GUIDE.md"
- **For Drizzle:** "Setup deployment for NestJS with Drizzle, VPS at X.X.X.X, use push:pg migration strategy"

**Key info to provide AI:**

- ORM type: Prisma or Drizzle
- VPS IP address and username
- Doppler project name
- DO Container Registry name
- Preferred migration strategy (for Drizzle: `push:pg` vs manual `migrate`)

---

**END OF GUIDE**
