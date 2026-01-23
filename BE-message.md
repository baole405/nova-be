# NOVA Backend - AI Agent Context Document

> **Mục đích**: Tài liệu này cung cấp toàn bộ context cho AI Agent phát triển Backend NestJS cho dự án NOVA.

---

## 📋 TL;DR - Bạn cần làm gì?

Bạn là AI Agent phụ trách **Backend (NestJS + PostgreSQL)** cho dự án NOVA - hệ thống quản lý chung cư.

**Frontend đã có sẵn**:

- ✅ Next.js 16 + TypeScript
- ✅ Neon Auth (Google OAuth) - JWT tokens
- ✅ UI Components (shadcn/ui)
- ✅ Protected routes middleware

**Bạn cần xây dựng**:

- 🔨 NestJS Backend với REST API
- 🔨 Database schema (PostgreSQL + Drizzle ORM)
- 🔨 JWT authentication middleware
- 🔨 CRUD APIs cho Bills, Transactions, Apartments

---

## 🎯 Core Problem (MVP Focus)

> Cư dân chung cư gặp khó khăn trong việc **theo dõi và thanh toán các khoản phí dịch vụ định kỳ** do thiếu hệ thống nhắc hạn → quên hạn → phí phạt.

**MVP Scope**: Chỉ làm quản lý phí dịch vụ, KHÔNG làm:

- ❌ Thanh toán thực tế (PayOS/VNPay)
- ❌ Quản lý sửa chữa/bảo trì
- ❌ IoT/AI features
- ❌ Admin dashboard

---

## 🗃️ Database Design

### Conceptual Model

```
USER (từ Neon Auth)
  ↓ owns
APARTMENT (Căn hộ)
  ↓ has many
BILL (Hóa đơn)
  ↓ belongs to
FEE_TYPE (Loại phí: Quản lý, Gửi xe, Điện, Nước...)

BILL
  ↓ has many
TRANSACTION (Giao dịch thanh toán)

USER
  ↓ has many
NOTIFICATION (Thông báo nhắc hạn)
```

### Tables cần tạo (8 tables)

#### 1. `users` (Sync với Neon Auth)

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  neon_auth_id VARCHAR(255) UNIQUE NOT NULL,  -- ID từ Neon Auth JWT
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  role VARCHAR(50) DEFAULT 'resident',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Lưu ý**:

- `neon_auth_id` map với `sub` trong JWT payload
- Khi user login lần đầu, tự động tạo record trong `users`

#### 2. `apartments` (Căn hộ)

```sql
CREATE TABLE apartments (
  id SERIAL PRIMARY KEY,
  unit_number VARCHAR(50) NOT NULL,      -- Số căn hộ: "2304"
  floor_number INTEGER,                  -- Tầng: 23
  block_name VARCHAR(50),                -- Block: "F04"
  owner_id INTEGER REFERENCES users(id),
  area_sqm DECIMAL(10,2),                -- Diện tích (m²)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `fee_types` (Loại phí)

```sql
CREATE TABLE fee_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,            -- "Phí quản lý", "Phí gửi xe"
  description TEXT,
  unit_price DECIMAL(10,2),              -- Đơn giá (nếu tính theo m²)
  measure_unit VARCHAR(50),              -- "VND/m²", "VND/tháng"
  is_recurring BOOLEAN DEFAULT true      -- Phí định kỳ hay 1 lần?
);
```

**Seed data mẫu**:

```sql
INSERT INTO fee_types (name, unit_price, measure_unit) VALUES
  ('Phí quản lý', 10000, 'VND/m²'),
  ('Phí gửi xe ô tô', 1500000, 'VND/tháng'),
  ('Phí gửi xe máy', 70000, 'VND/tháng'),
  ('Phí điện', NULL, 'VND/kWh'),
  ('Phí nước', NULL, 'VND/m³');
```

#### 4. `bills` (Hóa đơn) - **TABLE QUAN TRỌNG NHẤT**

```sql
CREATE TABLE bills (
  id SERIAL PRIMARY KEY,
  apartment_id INTEGER REFERENCES apartments(id),
  fee_type_id INTEGER REFERENCES fee_types(id),
  title VARCHAR(255) NOT NULL,           -- "Phí quản lý tháng 01/2026"
  amount DECIMAL(15,2) NOT NULL,         -- Số tiền: 756000
  period DATE NOT NULL,                  -- Kỳ thanh toán: 2026-01-01
  due_date DATE NOT NULL,                -- Hạn chót: 2026-01-25
  status VARCHAR(50) DEFAULT 'pending',  -- pending | paid | overdue
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP,

  -- Indexes
  INDEX idx_apartment_status (apartment_id, status),
  INDEX idx_due_date (due_date)
);
```

**Status logic**:

- `pending`: Chưa thanh toán, chưa quá hạn
- `overdue`: Chưa thanh toán, đã quá `due_date`
- `paid`: Đã thanh toán

#### 5. `transactions` (Giao dịch)

```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER REFERENCES bills(id),
  user_id INTEGER REFERENCES users(id),
  paid_amount DECIMAL(15,2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50),            -- 'bank_transfer', 'e_wallet', 'cash'
  transaction_ref VARCHAR(100),          -- Mã giao dịch (mock)
  notes TEXT
);
```

#### 6. `notifications` (Thông báo)

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'reminder',   -- reminder | announcement | alert
  is_read BOOLEAN DEFAULT false,
  related_bill_id INTEGER REFERENCES bills(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 7. `maintenance_requests` (Future - tạo table nhưng chưa dùng)

```sql
CREATE TABLE maintenance_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  apartment_id INTEGER REFERENCES apartments(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### 8. `announcements` (Future)

```sql
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id),
  published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  priority VARCHAR(50) DEFAULT 'normal'  -- normal | high | urgent
);
```

---

## 🔐 Authentication Flow

### JWT từ Frontend (Neon Auth)

Frontend gửi request với header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

JWT payload:

```json
{
  "sub": "6d58828d-bae5-4c69-a846-e2bb68ed03bd", // Neon Auth user ID
  "email": "user@example.com",
  "role": "authenticated",
  "exp": 1763848395,
  "iat": 1763847495
}
```

### Backend cần làm:

1. **Verify JWT** (dùng Neon Auth public key hoặc secret)
2. **Extract user info** từ payload
3. **Tìm/Tạo user** trong DB:

   ```typescript
   // Pseudo code
   const neonAuthId = jwtPayload.sub;
   let user = await db.users.findOne({ neon_auth_id: neonAuthId });

   if (!user) {
     // First time login → create user
     user = await db.users.create({
       neon_auth_id: neonAuthId,
       email: jwtPayload.email,
       full_name: jwtPayload.name || null,
     });
   }

   req.user = user; // Attach to request
   ```

---

## 📡 API Endpoints cần implement

### Base URL: `http://localhost:3001/api`

### 1. Bills Module

#### `GET /api/bills`

Lấy danh sách hóa đơn của user.

**Query params**:

- `status`: `pending` | `paid` | `overdue` | `all` (default: `all`)
- `limit`: số lượng (default: 50)
- `offset`: phân trang

**Response**:

```json
{
  "data": [
    {
      "id": 1,
      "title": "Phí quản lý tháng 01/2026",
      "amount": 756000,
      "period": "2026-01-01",
      "dueDate": "2026-01-25",
      "status": "pending",
      "feeType": {
        "id": 1,
        "name": "Phí quản lý"
      }
    }
  ],
  "total": 10,
  "page": 1
}
```

**Logic**:

1. Lấy `user_id` từ JWT
2. Tìm `apartment_id` của user
3. Query bills WHERE `apartment_id = ?`
4. Filter theo `status` nếu có
5. Populate `fee_type` info

---

#### `GET /api/bills/:id`

Chi tiết 1 hóa đơn.

**Response**:

```json
{
  "id": 1,
  "title": "Phí quản lý tháng 01/2026",
  "amount": 756000,
  "period": "2026-01-01",
  "dueDate": "2026-01-25",
  "status": "pending",
  "createdAt": "2026-01-01T00:00:00Z",
  "paidAt": null,
  "feeType": {
    "id": 1,
    "name": "Phí quản lý",
    "description": "Phí quản lý chung cư hàng tháng"
  },
  "apartment": {
    "unitNumber": "2304",
    "floor": 23,
    "block": "F04"
  },
  "breakdown": [
    { "item": "Phí quản lý cơ sở", "amount": 500000 },
    { "item": "Phí bảo trì", "amount": 200000 },
    { "item": "Phí dịch vụ", "amount": 56000 }
  ]
}
```

**Authorization**: Chỉ cho phép user xem bill của căn hộ mình.

---

#### `GET /api/bills/upcoming`

Lấy bills sắp đến hạn (trong 7 ngày tới).

**Response**: Giống `GET /api/bills` nhưng filter `due_date BETWEEN NOW() AND NOW() + 7 days`

---

#### `PATCH /api/bills/:id/mark-paid`

Đánh dấu hóa đơn đã thanh toán (Mock).

**Request body**:

```json
{
  "paymentMethod": "bank_transfer",
  "transactionRef": "TXN123456"
}
```

**Response**:

```json
{
  "message": "Bill marked as paid",
  "bill": {
    "id": 1,
    "status": "paid",
    "paidAt": "2026-01-23T10:30:00Z"
  },
  "transaction": {
    "id": 10,
    "amount": 756000,
    "method": "bank_transfer"
  }
}
```

**Logic**:

1. Update `bills.status = 'paid'`, `paid_at = NOW()`
2. Tạo record trong `transactions`

---

### 2. Transactions Module

#### `GET /api/transactions`

Lịch sử giao dịch của user.

**Query params**:

- `limit`, `offset`

**Response**:

```json
{
  "data": [
    {
      "id": 10,
      "billTitle": "Phí quản lý T12/2025",
      "amount": 756000,
      "paymentDate": "2025-12-20T14:30:00Z",
      "paymentMethod": "bank_transfer",
      "transactionRef": "TXN123456"
    }
  ]
}
```

---

#### `GET /api/transactions/by-month/:month`

Giao dịch theo tháng (format: `2025-12`).

**Response**: Giống trên, filter theo tháng.

---

### 3. Apartments Module

#### `GET /api/apartments/my`

Thông tin căn hộ của user.

**Response**:

```json
{
  "id": 1,
  "unitNumber": "2304",
  "floor": 23,
  "block": "F04",
  "areaSqm": 75.5,
  "owner": {
    "id": 1,
    "fullName": "Nguyễn Văn A",
    "email": "user@example.com"
  }
}
```

---

### 4. Notifications Module (Optional MVP)

#### `GET /api/notifications`

Danh sách thông báo.

#### `PATCH /api/notifications/:id/read`

Đánh dấu đã đọc.

---

## 🛠️ Tech Stack Requirements

| Component      | Technology                          |
| -------------- | ----------------------------------- |
| **Framework**  | NestJS 10                           |
| **Language**   | TypeScript (strict mode)            |
| **Database**   | PostgreSQL (Neon Serverless)        |
| **ORM**        | Drizzle ORM                         |
| **Auth**       | JWT (passport-jwt)                  |
| **Validation** | class-validator + class-transformer |
| **API Docs**   | Swagger/OpenAPI                     |
| **Testing**    | Jest (optional MVP)                 |

---

## 🔗 Integration với Frontend

### CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: ["http://localhost:3000", "https://nova-fe.vercel.app"],
  credentials: true,
});
```

### Frontend API Client Example

```typescript
// FE: src/lib/api-client.ts
import { authClient } from "@/lib/auth/client";

export async function getBills(status?: string) {
  const session = await authClient.getSession();

  const url = new URL("http://localhost:3001/api/bills");
  if (status) url.searchParams.set("status", status);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.data.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) throw new Error("Failed to fetch bills");
  return response.json();
}
```

---

## 📊 Sample Data (Seed Script)

Tạo script để seed database với data mẫu:

```typescript
// seed.ts
async function seed() {
  // 1. Create fee types
  const feeTypes = await db.feeTypes.createMany([
    { name: "Phí quản lý", unitPrice: 10000, measureUnit: "VND/m²" },
    { name: "Phí gửi xe ô tô", unitPrice: 1500000, measureUnit: "VND/tháng" },
    { name: "Phí gửi xe máy", unitPrice: 70000, measureUnit: "VND/tháng" },
  ]);

  // 2. Create apartments
  const apt = await db.apartments.create({
    unitNumber: "2304",
    floor: 23,
    blockName: "F04",
    areaSqm: 75.5,
    ownerId: 1, // User ID từ Neon Auth
  });

  // 3. Create bills
  await db.bills.createMany([
    {
      apartmentId: apt.id,
      feeTypeId: feeTypes[0].id,
      title: "Phí quản lý tháng 01/2026",
      amount: 756000,
      period: "2026-01-01",
      dueDate: "2026-01-25",
      status: "pending",
    },
    {
      apartmentId: apt.id,
      feeTypeId: feeTypes[1].id,
      title: "Phí gửi xe ô tô T01/2026",
      amount: 1500000,
      period: "2026-01-01",
      dueDate: "2026-01-25",
      status: "pending",
    },
  ]);
}
```

---

## ✅ Acceptance Criteria

Backend được coi là hoàn thành khi:

### Functional

- [ ] User login lần đầu → tự động tạo record trong `users`
- [ ] API `/api/bills` trả về đúng bills của user
- [ ] API `/api/bills/:id` có authorization check
- [ ] Mark as paid → update status + tạo transaction
- [ ] API `/api/transactions` trả về lịch sử đúng

### Non-functional

- [ ] API response time < 500ms (P95)
- [ ] TypeScript strict mode, no errors
- [ ] Swagger docs đầy đủ
- [ ] CORS config đúng
- [ ] Database migrations (Drizzle)

---

## 🚀 Deployment

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
NEON_AUTH_JWT_SECRET=your_secret_here
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://nova-fe.vercel.app
```

### Deploy Options

1. **Railway** (Recommended): `railway up`
2. **Render**: Connect GitHub repo
3. **Vercel Serverless Functions**: Export NestJS as serverless

---

## 📞 Questions?

Nếu có thắc mắc, tham khảo:

- `docs/PROJECT-SUMMARY.md` - Tổng quan dự án
- `docs/FUNCTIONAL-SPEC.md` - Đặc tả chức năng
- `docs/SYSTEM-REQUIREMENTS-SPEC.md` - Yêu cầu hệ thống
- `docs/BE-SETUP-GUIDE.md` - Hướng dẫn setup BE

---

**Good luck! 🚀**
