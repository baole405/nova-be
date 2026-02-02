import { Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { db } from "../database/database";
import { notifications, User } from "../database/schema";

@Injectable()
export class NotificationsService {
  async getNotifications(user: User, limit: number = 50, offset: number = 0) {
    const notificationsData = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${notifications.createdAt} DESC`);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(eq(notifications.userId, user.id));

    return {
      data: notificationsData,
      total: Number(count),
      unread: notificationsData.filter((n) => !n.isRead).length,
    };
  }

  async markAsRead(user: User, notificationId: number) {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, notificationId));

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.userId !== user.id) {
      throw new NotFoundException("Notification not found");
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId))
      .returning();

    return {
      message: "Notification marked as read",
      notification: updated,
    };
  }
}
