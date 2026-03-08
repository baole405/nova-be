import { config } from "dotenv";
config();

import * as bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
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
  // Delete in FK-safe order (children first)
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
  // Reset auto-increment sequences
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
  console.log("🌱 Seeding database...");

  try {
    await cleanup();

    // ── 1. Users (5 residents + 1 manager) ───────────────
    console.log("Creating users...");
    const hashedPassword = await bcrypt.hash("demo123456", 10);
    const usersData = await db
      .insert(users)
      .values([
        { username: "demo_user", email: "demo@nova.com", password: hashedPassword, fullName: "Nguyễn Văn An", phoneNumber: "0901234567", role: "resident" },
        { username: "thi_binh", email: "binh@nova.com", password: hashedPassword, fullName: "Trần Thị Bình", phoneNumber: "0912345678", role: "resident" },
        { username: "minh_cuong", email: "cuong@nova.com", password: hashedPassword, fullName: "Lê Minh Cường", phoneNumber: "0923456789", role: "resident" },
        { username: "hong_dao", email: "dao@nova.com", password: hashedPassword, fullName: "Phạm Hồng Đào", phoneNumber: "0934567890", role: "resident" },
        { username: "tuan_em", email: "tuan@nova.com", password: hashedPassword, fullName: "Võ Tuấn Em", phoneNumber: "0945678901", role: "resident" },
        { username: "admin_nova", email: "admin@nova.com", password: hashedPassword, fullName: "Nguyễn Quản Lý", phoneNumber: "0900000000", role: "manager" },
      ])
      .returning();
    console.log(`✅ Created ${usersData.length} users`);

    // ── 2. Fee Types ─────────────────────────────────────
    console.log("Creating fee types...");
    const feeTypeData = await db
      .insert(feeTypes)
      .values([
        { name: "Phí quản lý", description: "Phí quản lý chung cư hàng tháng", unitPrice: "10000", measureUnit: "VND/m²", isRecurring: true },
        { name: "Phí gửi xe ô tô", description: "Phí gửi xe ô tô hàng tháng", unitPrice: "1500000", measureUnit: "VND/tháng", isRecurring: true },
        { name: "Phí gửi xe máy", description: "Phí gửi xe máy hàng tháng", unitPrice: "70000", measureUnit: "VND/tháng", isRecurring: true },
        { name: "Phí nước sinh hoạt", description: "Phí sử dụng nước sinh hoạt", unitPrice: "15000", measureUnit: "VND/m³", isRecurring: true },
        { name: "Phí dịch vụ Internet", description: "Phí Internet cáp quang tòa nhà", unitPrice: "200000", measureUnit: "VND/tháng", isRecurring: true },
      ])
      .returning();
    console.log(`✅ Created ${feeTypeData.length} fee types`);

    // ── 3. Apartments (5 units across 2 blocks) ──────────
    console.log("Creating apartments...");
    const aptsData = await db
      .insert(apartments)
      .values([
        { unitNumber: "2304", floorNumber: 23, blockName: "S1", ownerId: usersData[0].id, areaSqm: "75.5" },
        { unitNumber: "1205", floorNumber: 12, blockName: "S1", ownerId: usersData[1].id, areaSqm: "52.3" },
        { unitNumber: "0801", floorNumber: 8, blockName: "S2", ownerId: usersData[2].id, areaSqm: "90.0" },
        { unitNumber: "1510", floorNumber: 15, blockName: "S2", ownerId: usersData[3].id, areaSqm: "65.8" },
        { unitNumber: "2001", floorNumber: 20, blockName: "S1", ownerId: usersData[4].id, areaSqm: "110.2" },
      ])
      .returning();
    console.log(`✅ Created ${aptsData.length} apartments`);

    // ── 3b. Apartment Fee Configs ──────────────────────────
    console.log("Creating apartment fee configs...");
    const aptFeeConfigDefs: { aptIdx: number; configs: { ftIdx: number; qty: number }[] }[] = [
      // Apt 2304: management + 1 car + water
      { aptIdx: 0, configs: [{ ftIdx: 0, qty: 1 }, { ftIdx: 1, qty: 1 }, { ftIdx: 3, qty: 1 }] },
      // Apt 1205: management + 1 motorbike + water + internet
      { aptIdx: 1, configs: [{ ftIdx: 0, qty: 1 }, { ftIdx: 2, qty: 1 }, { ftIdx: 3, qty: 1 }, { ftIdx: 4, qty: 1 }] },
      // Apt 0801: management + 1 car + water + internet
      { aptIdx: 2, configs: [{ ftIdx: 0, qty: 1 }, { ftIdx: 1, qty: 1 }, { ftIdx: 3, qty: 1 }, { ftIdx: 4, qty: 1 }] },
      // Apt 1510: management + 2 motorbikes + water
      { aptIdx: 3, configs: [{ ftIdx: 0, qty: 1 }, { ftIdx: 2, qty: 2 }, { ftIdx: 3, qty: 1 }] },
      // Apt 2001: management + 1 car + 1 motorbike + water + internet
      { aptIdx: 4, configs: [{ ftIdx: 0, qty: 1 }, { ftIdx: 1, qty: 1 }, { ftIdx: 2, qty: 1 }, { ftIdx: 3, qty: 1 }, { ftIdx: 4, qty: 1 }] },
    ];

    const configValues = aptFeeConfigDefs.flatMap((def) =>
      def.configs.map((c) => ({
        apartmentId: aptsData[def.aptIdx].id,
        feeTypeId: feeTypeData[c.ftIdx].id,
        quantity: c.qty,
      })),
    );
    await db.insert(apartmentFeeConfigs).values(configValues);
    console.log(`✅ Created ${configValues.length} apartment fee configs`);

    // ── 4. Bills & Bill Items (6 months x 5 apartments) ──
    console.log("Creating bills and bill items...");

    // Fee assignments per apartment: [feeTypeIndex, baseUsage | null]
    // null = flat fee, string = metered usage base value
    const feeAssignments: { aptIdx: number; fees: { ftIdx: number; baseUsage: string | null }[] }[] = [
      // Apt 2304 (75.5m²): management + car + water
      { aptIdx: 0, fees: [{ ftIdx: 0, baseUsage: "75.5" }, { ftIdx: 1, baseUsage: null }, { ftIdx: 3, baseUsage: "12.5" }] },
      // Apt 1205 (52.3m²): management + motorbike + water + internet
      { aptIdx: 1, fees: [{ ftIdx: 0, baseUsage: "52.3" }, { ftIdx: 2, baseUsage: null }, { ftIdx: 3, baseUsage: "8.2" }, { ftIdx: 4, baseUsage: null }] },
      // Apt 0801 (90.0m²): management + car + water + internet
      { aptIdx: 2, fees: [{ ftIdx: 0, baseUsage: "90.0" }, { ftIdx: 1, baseUsage: null }, { ftIdx: 3, baseUsage: "18.7" }, { ftIdx: 4, baseUsage: null }] },
      // Apt 1510 (65.8m²): management + motorbike + water
      { aptIdx: 3, fees: [{ ftIdx: 0, baseUsage: "65.8" }, { ftIdx: 2, baseUsage: null }, { ftIdx: 3, baseUsage: "10.1" }] },
      // Apt 2001 (110.2m²): management + car + motorbike + water + internet
      { aptIdx: 4, fees: [{ ftIdx: 0, baseUsage: "110.2" }, { ftIdx: 1, baseUsage: null }, { ftIdx: 2, baseUsage: null }, { ftIdx: 3, baseUsage: "22.3" }, { ftIdx: 4, baseUsage: null }] },
    ];

    // 6 months: Sep 2025 → Feb 2026
    const months = [
      { period: "2025-09-01", label: "09/2025", dueDate: "2025-09-25" },
      { period: "2025-10-01", label: "10/2025", dueDate: "2025-10-25" },
      { period: "2025-11-01", label: "11/2025", dueDate: "2025-11-25" },
      { period: "2025-12-01", label: "12/2025", dueDate: "2025-12-25" },
      { period: "2026-01-01", label: "01/2026", dueDate: "2026-01-25" },
      { period: "2026-02-01", label: "02/2026", dueDate: "2026-02-25" },
    ];

    const paymentMethods = ["bank_transfer", "momo", "vnpay"];
    let billCount = 0;
    let itemCount = 0;
    let txnCount = 0;
    const allBills: { id: number; apartmentId: number | null; title: string; amount: string; period: string; dueDate: string; status: string | null; paidAt: Date | null }[] = [];

    for (const assignment of feeAssignments) {
      const apt = aptsData[assignment.aptIdx];

      for (let mIdx = 0; mIdx < months.length; mIdx++) {
        const month = months[mIdx];

        // Calculate items and total amount
        const itemsToInsert: { ftIdx: number; usage: string | null; amount: number }[] = [];
        let totalAmount = 0;

        for (const fee of assignment.fees) {
          const ft = feeTypeData[fee.ftIdx];
          const unitPrice = Number(ft.unitPrice);
          let amount: number;

          if (fee.baseUsage) {
            // Metered fee: vary usage deterministically per month (±10%)
            const base = Number(fee.baseUsage);
            const variation = 0.92 + (mIdx * 0.03) + (assignment.aptIdx * 0.01);
            const monthUsage = Math.round(base * variation * 100) / 100;
            amount = Math.round(monthUsage * unitPrice) / 1;
            itemsToInsert.push({ ftIdx: fee.ftIdx, usage: monthUsage.toString(), amount });
          } else {
            // Flat fee
            amount = unitPrice;
            itemsToInsert.push({ ftIdx: fee.ftIdx, usage: null, amount });
          }
          totalAmount += amount;
        }

        // Bills before Jan 2026 are paid, Jan & Feb 2026 are pending
        const isPaid = month.period < "2026-01-01";
        const paidDay = 18 + (assignment.aptIdx % 5); // stagger payment days: 18-22
        const paidAt = isPaid ? new Date(`${month.period.slice(0, 7)}-${paidDay}T10:00:00Z`) : null;

        const [bill] = await db
          .insert(bills)
          .values({
            apartmentId: apt.id,
            title: `Hóa đơn tháng ${month.label}`,
            amount: totalAmount.toFixed(2),
            period: month.period,
            dueDate: month.dueDate,
            status: isPaid ? "paid" : "pending",
            paidAt,
          })
          .returning();

        allBills.push(bill);
        billCount++;

        // Create bill items
        for (const item of itemsToInsert) {
          const ft = feeTypeData[item.ftIdx];
          await db.insert(billItems).values({
            billId: bill.id,
            feeTypeId: ft.id,
            title: ft.name,
            usage: item.usage,
            unitPrice: ft.unitPrice,
            measureUnit: ft.measureUnit,
            amount: item.amount.toFixed(2),
          });
          itemCount++;
        }

        // Create transaction for paid bills
        if (isPaid) {
          const owner = usersData[assignment.aptIdx];
          const method = paymentMethods[(assignment.aptIdx + mIdx) % paymentMethods.length];
          await db.insert(transactions).values({
            billId: bill.id,
            userId: owner.id,
            paidAmount: totalAmount.toFixed(2),
            paymentDate: paidAt!,
            paymentMethod: method,
            transactionRef: `TXN${month.period.replace(/-/g, "").slice(0, 6)}${String(apt.id).padStart(3, "0")}`,
          });
          txnCount++;
        }
      }
    }
    console.log(`✅ Created ${billCount} bills, ${itemCount} bill items, ${txnCount} transactions`);

    // ── 5. Notifications ─────────────────────────────────
    console.log("Creating notifications...");
    const notifValues: {
      userId: number;
      title: string;
      content: string;
      type: string;
      isRead: boolean;
      relatedBillId: number | null;
    }[] = [];

    // Payment reminders for pending bills
    const pendingBills = allBills.filter((b) => b.status === "pending");
    for (const bill of pendingBills) {
      const assignment = feeAssignments.find((a) => aptsData[a.aptIdx].id === bill.apartmentId);
      if (!assignment) continue;
      notifValues.push({
        userId: usersData[assignment.aptIdx].id,
        title: "Nhắc nhở thanh toán",
        content: `Hóa đơn "${bill.title}" sẽ đến hạn vào ngày ${bill.dueDate}.`,
        type: "reminder",
        isRead: false,
        relatedBillId: bill.id,
      });
    }

    // Payment success notifications for most recent paid month (Dec 2025)
    const decBills = allBills.filter((b) => b.period === "2025-12-01" && b.status === "paid");
    for (const bill of decBills) {
      const assignment = feeAssignments.find((a) => aptsData[a.aptIdx].id === bill.apartmentId);
      if (!assignment) continue;
      notifValues.push({
        userId: usersData[assignment.aptIdx].id,
        title: "Thanh toán thành công",
        content: `Hóa đơn "${bill.title}" đã được thanh toán thành công. Số tiền: ${Number(bill.amount).toLocaleString("vi-VN")} VND.`,
        type: "payment",
        isRead: true,
        relatedBillId: bill.id,
      });
    }

    // General notifications
    notifValues.push(
      { userId: usersData[0].id, title: "Bảo trì thang máy", content: "Thang máy tòa S1 sẽ được bảo trì vào ngày 05/03/2026 từ 8h-12h. Cư dân vui lòng sử dụng cầu thang bộ.", type: "info", isRead: false, relatedBillId: null },
      { userId: usersData[1].id, title: "Bảo trì thang máy", content: "Thang máy tòa S1 sẽ được bảo trì vào ngày 05/03/2026 từ 8h-12h. Cư dân vui lòng sử dụng cầu thang bộ.", type: "info", isRead: false, relatedBillId: null },
      { userId: usersData[4].id, title: "Bảo trì thang máy", content: "Thang máy tòa S1 sẽ được bảo trì vào ngày 05/03/2026 từ 8h-12h. Cư dân vui lòng sử dụng cầu thang bộ.", type: "info", isRead: false, relatedBillId: null },
      { userId: usersData[2].id, title: "Cập nhật nội quy hồ bơi", content: "Ban quản lý đã cập nhật nội quy sử dụng hồ bơi. Vui lòng xem chi tiết tại bảng tin.", type: "info", isRead: false, relatedBillId: null },
      { userId: usersData[3].id, title: "Cập nhật nội quy hồ bơi", content: "Ban quản lý đã cập nhật nội quy sử dụng hồ bơi. Vui lòng xem chi tiết tại bảng tin.", type: "info", isRead: true, relatedBillId: null },
      { userId: usersData[0].id, title: "Yêu cầu sửa chữa hoàn thành", content: "Yêu cầu sửa chữa \"Rò rỉ nước phòng tắm\" đã được hoàn thành. Vui lòng kiểm tra và phản hồi.", type: "maintenance", isRead: true, relatedBillId: null },
      { userId: usersData[1].id, title: "Yêu cầu sửa chữa đang xử lý", content: "Yêu cầu sửa chữa \"Điều hòa không hoạt động\" đang được kỹ thuật viên xử lý.", type: "maintenance", isRead: false, relatedBillId: null },
      { userId: usersData[2].id, title: "Sửa chữa đường ống nước", content: "Nước sinh hoạt tòa S2 sẽ bị gián đoạn từ 22h ngày 15/02 đến 6h ngày 16/02/2026.", type: "info", isRead: true, relatedBillId: null },
      { userId: usersData[3].id, title: "Sửa chữa đường ống nước", content: "Nước sinh hoạt tòa S2 sẽ bị gián đoạn từ 22h ngày 15/02 đến 6h ngày 16/02/2026.", type: "info", isRead: true, relatedBillId: null },
    );

    await db.insert(notifications).values(notifValues);
    console.log(`✅ Created ${notifValues.length} notifications`);

    // ── 6. Facilities ────────────────────────────────────
    console.log("Creating facilities...");
    const facilitiesData = await db
      .insert(facilities)
      .values([
        { name: "Hồ bơi", description: "Hồ bơi ngoài trời tầng 5, mở cửa 6h-21h hàng ngày", location: "Tầng 5, Tòa S1", capacity: 30, isActive: true },
        { name: "Phòng Gym", description: "Phòng tập gym với đầy đủ thiết bị hiện đại", location: "Tầng 3, Tòa S1", capacity: 20, isActive: true },
        { name: "Khu BBQ", description: "Khu vực nướng BBQ ngoài trời, cần đặt trước 24h", location: "Tầng thượng, Tòa S2", capacity: 15, isActive: true },
        { name: "Phòng họp cộng đồng", description: "Phòng họp đa năng cho cư dân, trang bị máy chiếu và bảng trắng", location: "Tầng 2, Tòa S1", capacity: 50, isActive: true },
        { name: "Sân chơi trẻ em", description: "Khu vui chơi dành cho trẻ em dưới 12 tuổi", location: "Tầng 1, Khu vực ngoài", capacity: 25, isActive: true },
        { name: "Sân Tennis", description: "Sân tennis tiêu chuẩn, đang bảo trì đến 15/03/2026", location: "Tầng 6, Tòa S2", capacity: 4, isActive: false },
      ])
      .returning();
    console.log(`✅ Created ${facilitiesData.length} facilities`);

    // ── 7. Announcements ─────────────────────────────────
    console.log("Creating announcements...");
    const manager = usersData[5];
    await db.insert(announcements).values([
      {
        title: "Lịch bảo trì thang máy tháng 3/2026",
        content: "Ban quản lý thông báo lịch bảo trì định kỳ thang máy tòa S1 và S2 vào ngày 05/03/2026 từ 8h đến 12h. Trong thời gian bảo trì, cư dân vui lòng sử dụng cầu thang bộ. Xin cảm ơn sự hợp tác của quý cư dân.",
        authorId: manager.id, priority: "high", publishedAt: new Date("2026-02-25T08:00:00Z"),
      },
      {
        title: "Cập nhật nội quy sử dụng hồ bơi",
        content: "Kể từ ngày 01/03/2026, hồ bơi sẽ áp dụng quy định mới:\n- Trẻ em dưới 10 tuổi phải có người lớn đi kèm\n- Giờ hoạt động: 6h-21h hàng ngày\n- Vui lòng tắm tráng trước khi xuống hồ\n- Không mang thức ăn, đồ uống vào khu vực hồ bơi",
        authorId: manager.id, priority: "normal", publishedAt: new Date("2026-02-20T09:00:00Z"),
      },
      {
        title: "Thông báo thu phí quản lý quý 1/2026",
        content: "Ban quản lý thông báo phí quản lý quý 1/2026 đã được tính và gửi đến từng hộ. Hạn thanh toán: ngày 25 hàng tháng. Cư dân có thể thanh toán qua chuyển khoản ngân hàng, MoMo, hoặc VNPay.",
        authorId: manager.id, priority: "normal", publishedAt: new Date("2026-01-05T07:00:00Z"),
      },
      {
        title: "Tổ chức Tết Nguyên Đán 2026",
        content: "Ban quản lý kính mời quý cư dân tham gia chương trình đón Tết Nguyên Đán 2026 tại sảnh tầng 1 vào ngày 28/01/2026 từ 9h đến 17h. Chương trình bao gồm: gói bánh chưng, viết thư pháp, múa lân, và bốc thăm trúng thưởng.",
        authorId: manager.id, priority: "high", publishedAt: new Date("2026-01-20T08:00:00Z"),
      },
      {
        title: "Sửa chữa đường ống nước tòa S2",
        content: "Do sự cố đường ống nước tầng hầm tòa S2, nước sinh hoạt sẽ bị gián đoạn từ 22h ngày 15/02 đến 6h ngày 16/02/2026. Cư dân tòa S2 vui lòng dự trữ nước trước thời gian trên. Ban quản lý xin lỗi vì sự bất tiện này.",
        authorId: manager.id, priority: "high", publishedAt: new Date("2026-02-14T10:00:00Z"),
      },
      {
        title: "Đăng ký thẻ xe tháng 3/2026",
        content: "Cư dân có nhu cầu đăng ký thẻ xe ô tô/xe máy tháng 3/2026 vui lòng liên hệ ban quản lý trước ngày 28/02/2026. Phí gửi xe: Ô tô 1.500.000 VND/tháng, xe máy 70.000 VND/tháng.",
        authorId: manager.id, priority: "normal", publishedAt: new Date("2026-02-22T08:00:00Z"),
      },
    ]);
    console.log("✅ Created 6 announcements");

    // ── 8. Maintenance Requests ──────────────────────────
    console.log("Creating maintenance requests...");
    await db.insert(maintenanceRequests).values([
      {
        userId: usersData[0].id, apartmentId: aptsData[0].id,
        title: "Rò rỉ nước phòng tắm",
        description: "Phòng tắm chính bị rò rỉ nước từ trần nhà, nghi do đường ống tầng trên. Nước nhỏ giọt liên tục gây ẩm mốc.",
        status: "completed",
        createdAt: new Date("2026-01-15T08:00:00Z"), updatedAt: new Date("2026-01-18T14:00:00Z"),
      },
      {
        userId: usersData[1].id, apartmentId: aptsData[1].id,
        title: "Điều hòa không hoạt động",
        description: "Điều hòa phòng khách không lạnh, đã vệ sinh filter nhưng vẫn không cải thiện. Model: Daikin FTKM35.",
        status: "in_progress",
        createdAt: new Date("2026-02-20T10:00:00Z"), updatedAt: new Date("2026-02-22T09:00:00Z"),
      },
      {
        userId: usersData[2].id, apartmentId: aptsData[2].id,
        title: "Cửa kính ban công bị nứt",
        description: "Cửa kính ban công phòng ngủ bị nứt dọc khoảng 30cm, có nguy cơ vỡ. Cần xử lý gấp.",
        status: "pending",
        createdAt: new Date("2026-02-26T14:00:00Z"),
      },
      {
        userId: usersData[0].id, apartmentId: aptsData[0].id,
        title: "Ổ điện phòng bếp bị hỏng",
        description: "Ổ điện bên trái tủ bếp không có điện, đã kiểm tra CB vẫn bật. Có mùi khét nhẹ khi cắm thiết bị.",
        status: "in_progress",
        createdAt: new Date("2026-02-25T16:00:00Z"), updatedAt: new Date("2026-02-27T08:00:00Z"),
      },
      {
        userId: usersData[4].id, apartmentId: aptsData[4].id,
        title: "Sàn gỗ phòng khách bị phồng",
        description: "Sàn gỗ phòng khách bị phồng rộp khoảng 2m², nghi do ẩm từ tầng hầm.",
        status: "pending",
        createdAt: new Date("2026-02-27T09:00:00Z"),
      },
      {
        userId: usersData[3].id, apartmentId: aptsData[3].id,
        title: "Khóa cửa chính bị kẹt",
        description: "Khóa cửa chính căn hộ bị kẹt, khó xoay chìa. Đã xịt dầu bôi trơn nhưng không cải thiện.",
        status: "completed",
        createdAt: new Date("2026-02-10T11:00:00Z"), updatedAt: new Date("2026-02-12T15:00:00Z"),
      },
      {
        userId: usersData[2].id, apartmentId: aptsData[2].id,
        title: "Đèn hành lang tầng 8 bị hỏng",
        description: "Đèn LED hành lang trước cửa căn 0801 bị nhấp nháy và tắt. Gây bất tiện khi di chuyển buổi tối.",
        status: "completed",
        createdAt: new Date("2026-01-28T19:00:00Z"), updatedAt: new Date("2026-01-30T10:00:00Z"),
      },
    ]);
    console.log("✅ Created 7 maintenance requests");

    // ── 9. Visitors ──────────────────────────────────────
    console.log("Creating visitors...");
    await db.insert(visitors).values([
      {
        residentId: usersData[0].id, guestName: "Nguyễn Thị Mai", phoneNumber: "0987654321",
        purpose: "Thăm gia đình",
        expectedArrival: new Date("2026-03-01T09:00:00Z"), expectedDeparture: new Date("2026-03-01T18:00:00Z"),
        accessCode: "VISIT-001-A2304", status: "pending",
      },
      {
        residentId: usersData[0].id, guestName: "Trần Văn Hùng", phoneNumber: "0976543210", vehiclePlate: "59A-12345",
        purpose: "Giao hàng nội thất",
        expectedArrival: new Date("2026-03-02T14:00:00Z"), expectedDeparture: new Date("2026-03-02T16:00:00Z"),
        accessCode: "VISIT-002-A2304", status: "pending",
      },
      {
        residentId: usersData[1].id, guestName: "Lê Thị Hoa", phoneNumber: "0965432109",
        purpose: "Thăm bạn",
        expectedArrival: new Date("2026-03-01T10:00:00Z"), expectedDeparture: new Date("2026-03-01T20:00:00Z"),
        accessCode: "VISIT-003-A1205", status: "pending",
      },
      {
        residentId: usersData[2].id, guestName: "Phạm Quốc Bảo", phoneNumber: "0954321098", vehiclePlate: "51H-67890",
        purpose: "Sửa chữa điều hòa",
        expectedArrival: new Date("2026-02-28T08:00:00Z"), expectedDeparture: new Date("2026-02-28T12:00:00Z"),
        accessCode: "VISIT-004-A0801", status: "arrived",
        checkInAt: new Date("2026-02-28T08:15:00Z"),
      },
      {
        residentId: usersData[3].id, guestName: "Võ Minh Tâm", phoneNumber: "0943210987",
        purpose: "Tiệc sinh nhật",
        expectedArrival: new Date("2026-02-15T17:00:00Z"), expectedDeparture: new Date("2026-02-15T22:00:00Z"),
        accessCode: "VISIT-005-A1510", status: "expired",
        checkInAt: new Date("2026-02-15T17:10:00Z"), checkOutAt: new Date("2026-02-15T21:30:00Z"),
      },
      {
        residentId: usersData[4].id, guestName: "Đỗ Thanh Tùng", phoneNumber: "0932109876", vehiclePlate: "59C-11111",
        purpose: "Giao hàng Shopee",
        expectedArrival: new Date("2026-02-27T14:00:00Z"), expectedDeparture: new Date("2026-02-27T14:30:00Z"),
        accessCode: "VISIT-006-A2001", status: "expired",
        checkInAt: new Date("2026-02-27T14:05:00Z"), checkOutAt: new Date("2026-02-27T14:20:00Z"),
      },
      {
        residentId: usersData[0].id, guestName: "Bùi Thị Lan", phoneNumber: "0921098765",
        purpose: "Giúp việc nhà",
        expectedArrival: new Date("2026-03-03T07:00:00Z"), expectedDeparture: new Date("2026-03-03T17:00:00Z"),
        accessCode: "VISIT-007-A2304", status: "pending",
      },
      {
        residentId: usersData[1].id, guestName: "Hoàng Minh Đức", phoneNumber: "0910987654",
        purpose: "Thăm người thân",
        expectedArrival: new Date("2026-02-20T09:00:00Z"), expectedDeparture: new Date("2026-02-20T21:00:00Z"),
        accessCode: "VISIT-008-A1205", status: "expired",
        checkInAt: new Date("2026-02-20T09:30:00Z"), checkOutAt: new Date("2026-02-20T19:00:00Z"),
      },
    ]);
    console.log("✅ Created 8 visitors");

    // ── 10. Bookings ─────────────────────────────────────
    console.log("Creating bookings...");
    await db.insert(bookings).values([
      { userId: usersData[0].id, serviceType: "bbq", date: "2026-03-08", startTime: "17:00", endTime: "21:00", status: "confirmed", notes: "Tiệc gia đình 10 người" },
      { userId: usersData[1].id, serviceType: "bbq", date: "2026-03-15", startTime: "18:00", endTime: "22:00", status: "pending", notes: "Sinh nhật con gái" },
      { userId: usersData[2].id, serviceType: "parking", slotNumber: "B12", date: "2026-03-01", endDate: "2026-03-31", startTime: "00:00", endTime: "23:59", status: "confirmed", notes: "Thuê chỗ đậu xe tháng 3" },
      { userId: usersData[0].id, serviceType: "parking", slotNumber: "A05", date: "2026-03-01", endDate: "2026-03-31", startTime: "00:00", endTime: "23:59", status: "confirmed" },
      { userId: usersData[4].id, serviceType: "bbq", date: "2026-03-22", startTime: "11:00", endTime: "14:00", status: "pending", notes: "Họp mặt bạn bè 8 người" },
      { userId: usersData[3].id, serviceType: "bbq", date: "2026-02-20", startTime: "17:00", endTime: "20:00", status: "cancelled", notes: "Hủy do thời tiết xấu" },
      { userId: usersData[4].id, serviceType: "parking", slotNumber: "A08", date: "2026-02-01", endDate: "2026-02-28", startTime: "00:00", endTime: "23:59", status: "confirmed", notes: "Thuê chỗ đậu xe tháng 2" },
      { userId: usersData[1].id, serviceType: "bbq", date: "2026-02-10", startTime: "10:00", endTime: "13:00", status: "confirmed", notes: "Tiệc Tất Niên" },
    ]);
    console.log("✅ Created 8 bookings");

    // ── Summary ──────────────────────────────────────────
    console.log("\n🎉 Seed completed successfully!");
    console.log(`   👤 ${usersData.length} users (5 residents + 1 manager)`);
    console.log(`   🏠 ${aptsData.length} apartments (blocks S1, S2)`);
    console.log(`   💰 ${feeTypeData.length} fee types`);
    console.log(`   🔗 ${configValues.length} apartment fee configs`);
    console.log(`   📄 ${billCount} bills, ${itemCount} bill items`);
    console.log(`   💳 ${txnCount} transactions`);
    console.log(`   🔔 ${notifValues.length} notifications`);
    console.log(`   📢 6 announcements`);
    console.log(`   🔧 7 maintenance requests`);
    console.log(`   🏢 ${facilitiesData.length} facilities`);
    console.log(`   👥 8 visitors`);
    console.log(`   📅 8 bookings`);
    console.log(`\n   🔑 All users password: demo123456`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
