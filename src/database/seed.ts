import { config } from "dotenv";
config();

import * as bcrypt from "bcrypt";
import { sql, eq } from "drizzle-orm";
import { db } from "./database";
import {
  announcements,
  apartmentFeeConfigs,
  apartments,
  billItems,
  bills,
  bookings,
  facilities,
  feeTypes,
  maintenanceRequests,
  notifications,
  transactions,
  users,
  visitors,
} from "./schema";

async function cleanup() {
  console.log("🧹 Cleaning up existing data...");
  await db.delete(transactions);
  await db.delete(notifications);
  await db.delete(billItems);
  await db.delete(bills);
  await db.delete(maintenanceRequests);
  await db.delete(bookings);
  await db.delete(announcements);
  await db.delete(apartmentFeeConfigs);
  await db.delete(visitors);
  await db.delete(apartments);
  await db.delete(feeTypes);
  await db.delete(facilities);
  await db.delete(users);
  
  await db.execute(sql`ALTER SEQUENCE users_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE apartments_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE apartment_fee_configs_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE fee_types_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE bills_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE bill_items_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE transactions_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE notifications_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE announcements_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE facilities_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE bookings_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE maintenance_requests_id_seq RESTART WITH 1`);
  await db.execute(sql`ALTER SEQUENCE visitors_id_seq RESTART WITH 1`);
  console.log("✅ Cleanup complete");
}

async function seed() {
  console.log("🌱 Seeding CLEAN database for Outcome 3...");

  try {
    await cleanup();

    const hashedPassword = await bcrypt.hash("demo123456", 10);

    // 1. Create Fee Types (Required for system logic)
    console.log("Creating fee types...");
    const feeTypeData = await db.insert(feeTypes).values([
      { name: "Phí quản lý", description: "Phí quản lý hàng tháng", unitPrice: "10000", measureUnit: "VND/m²", isRecurring: true },
      { name: "Phí gửi xe máy", description: "Phí gửi xe máy hàng tháng", unitPrice: "70000", measureUnit: "VND/tháng", isRecurring: true },
      { name: "Phí nước sinh hoạt", description: "Phí sử dụng nước", unitPrice: "15000", measureUnit: "VND/m³", isRecurring: true },
      { name: "Gói Plus (Member)", description: "Đăng ký gói quản lý Plus", unitPrice: "59000", measureUnit: "VND/tháng", isRecurring: true },
      { name: "Gói Pro (Member)", description: "Đăng ký gói quản lý Pro", unitPrice: "99000", measureUnit: "VND/tháng", isRecurring: true },
    ]).returning();

    // 2. Mrs. Hương's Residents (14 units)
    console.log("Seeding Mrs. Huong's 14 residents...");
    const huongResidentNames = [
      "Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Dung",
      "Hoàng Văn Em", "Ngô Thị Phương", "Vũ Đình Giáp", "Đặng Thị Hoa",
      "Bùi Văn Hùng", "Lý Thị Kim", "Chu Văn Long", "Phan Thị Mai",
      "Trịnh Văn Nam", "Đỗ Thị Oanh"
    ];

    const [huongUser] = await db.insert(users).values({
      username: "huong_landlord",
      email: "huong.landlord@example.com",
      password: hashedPassword,
      fullName: "Nguyễn Thị Kim Hương",
      role: "manager",
    }).returning();

    for (let i = 0; i < 14; i++) {
        const [resident] = await db.insert(users).values({
          username: `huong_res_${i+1}`,
          email: `huong.res${i+1}@example.com`,
          password: hashedPassword,
          fullName: huongResidentNames[i],
          role: "resident",
        }).returning();

        await db.insert(apartments).values({
          unitNumber: `P.${(i + 1) < 10 ? "0" + (i + 1) : (i + 1)}`,
          floorNumber: Math.floor(i / 5) + 1,
          blockName: "Dãy trọ Bà Hương",
          ownerId: resident.id,
          areaSqm: "18.00",
          status: "occupied",
        });
    }

    // 3. Mr. Khang's Residents (8 units)
    console.log("Seeding Mr. Khang's 8 residents...");
    const khangResidentNames = [
      "Nguyễn Vĩnh Bảo", "Trần Khang Anh", "Lê Minh Triết", "Phạm Hoàng Gia",
      "Võ Minh Khôi", "Đặng Vĩnh Thụy", "Bùi Vĩnh Phát", "Ngô Khang Thịnh"
    ];

    const [khangUser] = await db.insert(users).values({
      username: "khang_landlord",
      email: "khang.landlord@example.com",
      password: hashedPassword,
      fullName: "Nguyễn Phúc Vĩnh Khang",
      role: "manager",
    }).returning();

    for (let i = 0; i < 8; i++) {
        const [resident] = await db.insert(users).values({
          username: `khang_res_${i+1}`,
          email: `khang.res${i+1}@example.com`,
          password: hashedPassword,
          fullName: khangResidentNames[i],
          role: "resident",
        }).returning();

        await db.insert(apartments).values({
          unitNumber: `M.${(i + 1) < 10 ? "0" + (i + 1) : (i + 1)}`,
          floorNumber: Math.floor(i / 4) + 1,
          blockName: "CHMN Vĩnh Khang",
          ownerId: resident.id,
          areaSqm: "25.00",
          status: "occupied",
        });
    }

    // 4. Create some basic announcements so the dashboard isn't empty
    await db.insert(announcements).values([
      { title: "Thông báo nộp tiền phòng tháng 4", content: "Quý khách vui lòng nộp tiền đúng hạn trước ngày 10/4.", authorId: huongUser.id, priority: "high" }
    ]);

    // 5. Create Feedback (Maintenance Requests)
    console.log("Seeding feedback...");
    await db.insert(maintenanceRequests).values([
      {
        userId: huongUser.id,
        title: "Góp ý cải thiện app",
        description: "Chào các con nha, cô có dùng thử qua app cô thấy các con làm rất đẹp và dễ nhìn, các bạn sinh viên ở trọ cũng đánh giá app rất đẹp nhưng cô muốn hỏi nếu cô muốn chat với các bạn thì các con có thể phát triển tiếp thì sẽ rất hay. Đó là ý kiến của cô, chúc các bạn thành công.",
        status: "pending",
        createdAt: new Date("2026-04-19T09:00:00Z")
      },
      {
        userId: khangUser.id,
        title: "Góp ý cải thiện tính năng",
        description: "Web đẹp, ổn. Các bạn có làm nhưng còn thiếu tính năng mà anh cần ví dụ như anh sẽ gửi khiếu nại nếu app lỗi qua đâu, nếu anh có thêm một căn nữa thì anh bỏ vào đâu? Đây chỉ là ý kiến riêng của anh, về tổng quan các bạn làm tạm ổn, cần cải thiện thêm nhé",
        status: "pending",
        createdAt: new Date("2026-04-18T10:30:00Z")
      }
    ]);

    // 6. Create Bills and Transactions for revenue stats
    console.log("Seeding bills and transactions...");
    const [bill1] = await db.insert(bills).values({
      apartmentId: 1, // First unit
      title: "Hóa đơn tháng 4/2026",
      amount: "2500000",
      period: "2026-04-01",
      dueDate: "2026-04-10",
      status: "paid",
      paidAt: new Date(),
    }).returning();

    await db.insert(transactions).values({
      billId: bill1.id,
      userId: huongUser.id,
      paidAmount: "2500000",
      paymentMethod: "bank_transfer",
    });

    await db.insert(bills).values({
      apartmentId: 2,
      title: "Hóa đơn tháng 4/2026",
      amount: "2500000",
      period: "2026-04-01",
      dueDate: "2026-04-10",
      status: "pending",
    });

    await db.insert(bills).values({
      apartmentId: 15, // Khang's first unit
      title: "Hóa đơn tháng 4/2026",
      amount: "4500000",
      period: "2026-04-01",
      dueDate: "2026-04-10",
      status: "paid",
      paidAt: new Date(),
    }).returning();

    const [bill3] = await db.select().from(bills).where(eq(bills.apartmentId, 15)).limit(1);
    await db.insert(transactions).values({
      billId: bill3.id,
      userId: khangUser.id,
      paidAmount: "4500000",
      paymentMethod: "vnpay",
    });

    console.log("\n🎉 CLEAN Seed completed successfully!");
    console.log("🔑 All users password: demo123456");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
