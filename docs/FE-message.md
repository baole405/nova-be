# 🚀 NOVA Backend - Sẵn sàng cho Frontend Testing

## ✅ Trạng thái: HOÀN THÀNH - Sẵn sàng tích hợp

Backend đã được deploy và đang chạy ổn định trên VPS với đầy đủ API endpoints.

---

## 🌐 Thông tin Deployment

### Backend API

- **URL**: http://167.71.210.47:4000
- **Swagger Docs**: http://167.71.210.47:4000/api/docs
- **Status**: ✅ Running (24/7)

### Database

- **Type**: PostgreSQL 16
- **Status**: ✅ Running in Docker
- **Tables**: 9 tables (users, apartments, bills, transactions, notifications, etc.)

---

## 📡 API Endpoints Sẵn Sàng (9 endpoints)

### 1️⃣ Bills Module

| Method  | Endpoint                   | Description                                            |
| ------- | -------------------------- | ------------------------------------------------------ |
| `GET`   | `/api/bills`               | Lấy danh sách bills (có filter: status, limit, offset) |
| `GET`   | `/api/bills/:id`           | Chi tiết 1 bill                                        |
| `GET`   | `/api/bills/upcoming`      | Bills sắp đến hạn                                      |
| `PATCH` | `/api/bills/:id/mark-paid` | Đánh dấu đã thanh toán (mock)                          |

### 2️⃣ Transactions Module

| Method | Endpoint                            | Description                            |
| ------ | ----------------------------------- | -------------------------------------- |
| `GET`  | `/api/transactions`                 | Lịch sử giao dịch                      |
| `GET`  | `/api/transactions/by-month/:month` | Giao dịch theo tháng (format: YYYY-MM) |

### 3️⃣ Apartments Module

| Method | Endpoint             | Description               |
| ------ | -------------------- | ------------------------- |
| `GET`  | `/api/apartments/my` | Thông tin căn hộ của user |

### 4️⃣ Notifications Module

| Method  | Endpoint                      | Description         |
| ------- | ----------------------------- | ------------------- |
| `GET`   | `/api/notifications`          | Danh sách thông báo |
| `PATCH` | `/api/notifications/:id/read` | Đánh dấu đã đọc     |

---

## 🔐 Authentication

### JWT Token

- **Loại**: Bearer Token
- **Source**: Neon Auth (từ frontend login)
- **Header**: `Authorization: Bearer <token>`

### Lấy Token để Test

1. Login qua frontend UI
2. Mở DevTools → Application → Local Storage
3. Copy giá trị `accessToken`
4. Hoặc check localStorage trong code: `localStorage.getItem('accessToken')`

---

## 🧪 Cách Test API

### Option 1: Swagger UI (Khuyến nghị)

1. Mở: http://167.71.210.47:4000/api/docs
2. Click nút **Authorize** (góc trên bên phải)
3. Paste JWT token (có hoặc không có `Bearer ` đều được)
4. Click **Authorize** → **Close**
5. Test bất kỳ endpoint nào bằng nút **Try it out**

### Option 2: cURL

```bash
# Lấy danh sách bills
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://167.71.210.47:4000/api/bills

# Lấy bills có filter
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://167.71.210.47:4000/api/bills?status=pending&limit=10"

# Đánh dấu bill đã thanh toán
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"bank","notes":"Test payment"}' \
  http://167.71.210.47:4000/api/bills/1/mark-paid
```

### Option 3: Postman

1. Import URL: http://167.71.210.47:4000/api/docs-json
2. Tạo Environment với variable `token`
3. Set Authorization: Bearer Token → `{{token}}`

---

## 📊 Sample Data (Đã Seed)

Database đã có sẵn data mẫu để test:

### User Demo

- **Email**: demo@nova.com
- **Full Name**: Nguyễn Văn A
- **Phone**: 0901234567

### Apartment

- **Code**: A-0101
- **Area**: 75 m²
- **Floor**: 1, Block A

### Bills (3 bills)

- Tháng 1/2026: 750,000đ (pending)
- Tháng 2/2026: 750,000đ (pending)
- Tháng 3/2026: 750,000đ (paid) - có transaction

### Transactions (1 record)

- Bill tháng 3: 750,000đ - Paid via bank transfer

---

## 🔄 CI/CD Status

### GitHub Actions

- **Workflow**: Auto-deploy on push to `main` branch
- **Status**: ✅ Configured
- **Process**:
  1. Push code → GitHub
  2. GitHub Actions SSH vào VPS
  3. Pull code mới
  4. Docker rebuild
  5. Restart containers
  6. Verify deployment

### Manual Deploy (Backup)

```bash
# SSH vào VPS
ssh -i ~/.ssh/nova_key root@167.71.210.47

# Pull code mới
cd /root/nova-be
git pull origin main

# Rebuild và restart
docker compose down
docker compose up -d --build

# Check logs
docker compose logs -f backend
```

---

## 📋 Checklist Hoàn Thành

### Backend Core

- ✅ NestJS 10 setup
- ✅ PostgreSQL 16 + Docker
- ✅ Drizzle ORM
- ✅ Database schema (9 tables)
- ✅ Sample data seeding

### Authentication

- ✅ JWT strategy
- ✅ JWT Guard
- ✅ Neon Auth integration
- ✅ Protected endpoints

### API Modules

- ✅ Bills module (4 endpoints)
- ✅ Transactions module (2 endpoints)
- ✅ Apartments module (1 endpoint)
- ✅ Notifications module (2 endpoints)

### Documentation

- ✅ Swagger/OpenAPI docs
- ✅ README with quick start
- ✅ API testing guide
- ✅ Deployment guide

### Deployment

- ✅ Docker containerization
- ✅ VPS deployment
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ 24/7 availability

### Security

- ✅ CORS configuration
- ✅ JWT validation
- ✅ Input validation (class-validator)
- ✅ SQL injection prevention (Drizzle ORM)

---

## 🎯 Frontend Integration Steps

### 1. API Client Setup (Đã có)

File: `nova-fe/src/lib/api-client.ts`

```typescript
const token = localStorage.getItem("accessToken");
const response = await fetch("http://167.71.210.47:4000/api/bills", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### 2. Test Flow

1. ✅ Login → Lưu token vào localStorage
2. ✅ Fetch data từ API với token
3. ✅ Hiển thị data lên UI
4. ✅ Handle errors (401, 403, 500)

### 3. Recommended: Tạo API Wrapper

```typescript
// lib/api.ts
async function apiFetch(endpoint: string, options = {}) {
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`http://167.71.210.47:4000${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// Usage
const bills = await apiFetch("/api/bills?status=pending");
```

---

## 🐛 Troubleshooting

### Lỗi 401 Unauthorized

- **Nguyên nhân**: Token không hợp lệ hoặc đã hết hạn
- **Fix**: Login lại để lấy token mới

### Lỗi CORS

- **Nguyên nhân**: Frontend URL không trong whitelist
- **Fix**: Đã config CORS cho `http://localhost:5000` và production URL

### Lỗi 500 Internal Server Error

- **Check logs**:
  ```bash
  ssh root@167.71.210.47
  docker compose logs -f backend
  ```

### API không response

- **Check service**:
  ```bash
  docker compose ps
  curl http://localhost:4000/api/bills
  ```

---

## 📞 Support & Contact

### Backend Developer

- **GitHub**: baole405/nova-be
- **Branch**: main
- **Last Deploy**: Feb 2, 2026

### Resources

- **Swagger Docs**: http://167.71.210.47:4000/api/docs
- **Setup Guide**: [nova-be/README.md](README.md)
- **API Examples**: [test_api.ts](test_api.ts)

---

## 🎉 Ready to Rock!

Backend đã sẵn sàng 100% để FE team tích hợp và test. Mọi thắc mắc về API behavior, response format, hoặc lỗi gì thì ping nhé! 🚀

**Next Steps cho FE:**

1. ✅ Test login → Verify token lưu đúng
2. ✅ Test API calls với token
3. ✅ Implement remaining pages (theo TASKS-SUMMARY.md)
4. ✅ Integration testing
5. ✅ Production deployment

---

_Last Updated: Feb 2, 2026_
