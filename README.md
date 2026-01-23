# NOVA Backend - Quick Start Guide

## 📋 Prerequisites

1. **Node.js** (v18 or higher): https://nodejs.org
2. **Docker Desktop**: https://www.docker.com/products/docker-desktop

## 🚀 Quick Start

### Bước 1: Cài dependencies

```bash
npm install
```

### Bước 2: Start PostgreSQL với Docker

```bash
npm run docker:up
```

Chờ 10-15 giây để PostgreSQL khởi động hoàn toàn.

### Bước 3: Setup database

```bash
# Push schema to database
npm run db:push

# Seed sample data
npm run db:seed
```

### Bước 4: Start backend

```bash
npm run start:dev
```

Backend sẽ chạy tại: **http://localhost:3001**

## 📚 Useful URLs

- **API Swagger Docs**: http://localhost:3001/api/docs
- **pgAdmin** (Database UI): http://localhost:5050
  - Email: `admin@nova.com`
  - Password: `admin`

## 🗄️ Database Connection (pgAdmin)

1. Mở http://localhost:5050
2. Login với `admin@nova.com` / `admin`
3. Add New Server:
   - Name: `NOVA Local`
   - Host: `postgres` (hoặc `localhost`)
   - Port: `5432`
   - Database: `nova_db`
   - Username: `postgres`
   - Password: `postgres`

## 🧪 Test API

### Lấy JWT Token từ Frontend

Bạn cần JWT token từ Neon Auth (frontend). Sau đó test API:

```bash
# Get bills
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/api/bills

# Get apartment info
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/api/apartments/my
```

## 📝 Available Scripts

- `npm run start:dev` - Start backend (watch mode)
- `npm run docker:up` - Start PostgreSQL
- `npm run docker:down` - Stop PostgreSQL
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed sample data
- `npm run db:studio` - Open Drizzle Studio (Database UI)

## 🔧 Troubleshooting

### Port 5432 already in use

```bash
# Stop existing PostgreSQL
npm run docker:down

# Or change port in docker-compose.yml
```

### Database connection error

```bash
# Check if PostgreSQL is running
docker ps

# Restart PostgreSQL
npm run docker:down
npm run docker:up
```

## 📖 Next Steps

1. Cập nhật `NEON_AUTH_JWT_SECRET` trong `.env` với secret thật từ Neon Auth
2. Test tất cả endpoints trên Swagger UI
3. Integrate với Frontend Next.js
