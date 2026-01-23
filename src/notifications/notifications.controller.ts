import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { User } from "../database/schema";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "Get all notifications for current user" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  async getNotifications(
    @CurrentUser() user: User,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("offset", new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.notificationsService.getNotifications(user, limit, offset);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notification as read" })
  async markAsRead(
    @CurrentUser() user: User,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markAsRead(user, id);
  }
}
