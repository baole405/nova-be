import { config } from "dotenv";
config();

import { db } from "./database";
import {
  apartments,
  bills,
  feeTypes,
  notifications,
  transactions,
  users,
} from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // 1. Create sample user
    console.log("Creating sample user...");
    const [user] = await db
      .insert(users)
      .values({
        neonAuthId: "sample-neon-auth-id-123",
        email: "demo@nova.com",
        fullName: "Nguyễn Văn A",
        phoneNumber: "0901234567",
        role: "resident",
      })
      .returning();
    console.log("✅ User created:", user.email);

    // 2. Create fee types
    console.log("Creating fee types...");
    const feeTypeData = await db
      .insert(feeTypes)
      .values([
        {
          name: "Phí quản lý",
          description: "Phí quản lý chung cư hàng tháng",
          unitPrice: "10000",
          measureUnit: "VND/m²",
          isRecurring: true,
        },
        {
          name: "Phí gửi xe ô tô",
          description: "Phí gửi xe ô tô hàng tháng",
          unitPrice: "1500000",
          measureUnit: "VND/tháng",
          isRecurring: true,
        },
        {
          name: "Phí gửi xe máy",
          description: "Phí gửi xe máy hàng tháng",
          unitPrice: "70000",
          measureUnit: "VND/tháng",
          isRecurring: true,
        },
      ])
      .returning();
    console.log(`✅ Created ${feeTypeData.length} fee types`);

    // 3. Create apartment
    console.log("Creating apartment...");
    const [apartment] = await db
      .insert(apartments)
      .values({
        unitNumber: "2304",
        floorNumber: 23,
        blockName: "F04",
        ownerId: user.id,
        areaSqm: "75.5",
      })
      .returning();
    console.log("✅ Apartment created:", apartment.unitNumber);

    // 4. Create bills
    console.log("Creating bills...");
    const billsData = await db
      .insert(bills)
      .values([
        {
          apartmentId: apartment.id,
          feeTypeId: feeTypeData[0].id,
          title: "Phí quản lý tháng 01/2026",
          amount: "756000",
          period: "2026-01-01",
          dueDate: "2026-01-25",
          status: "pending",
        },
        {
          apartmentId: apartment.id,
          feeTypeId: feeTypeData[1].id,
          title: "Phí gửi xe ô tô T01/2026",
          amount: "1500000",
          period: "2026-01-01",
          dueDate: "2026-01-25",
          status: "pending",
        },
        {
          apartmentId: apartment.id,
          feeTypeId: feeTypeData[0].id,
          title: "Phí quản lý tháng 12/2025",
          amount: "756000",
          period: "2025-12-01",
          dueDate: "2025-12-25",
          status: "paid",
          paidAt: new Date("2025-12-20"),
        },
      ])
      .returning();
    console.log(`✅ Created ${billsData.length} bills`);

    // 5. Create transaction
    const paidBill = billsData.find((b) => b.status === "paid");
    if (paidBill) {
      await db.insert(transactions).values({
        billId: paidBill.id,
        userId: user.id,
        paidAmount: paidBill.amount,
        paymentDate: new Date("2025-12-20T14:30:00Z"),
        paymentMethod: "bank_transfer",
        transactionRef: "TXN20251220001",
      });
      console.log("✅ Transaction created");
    }

    // 6. Create notifications
    const upcomingBill = billsData.find((b) => b.status === "pending");
    if (upcomingBill) {
      await db.insert(notifications).values([
        {
          userId: user.id,
          title: "Nhắc nhở thanh toán",
          content: `Hóa đơn "${upcomingBill.title}" sẽ đến hạn vào ngày ${upcomingBill.dueDate}`,
          type: "reminder",
          isRead: false,
          relatedBillId: upcomingBill.id,
        },
      ]);
      console.log("✅ Notifications created");
    }

    console.log("\n🎉 Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
