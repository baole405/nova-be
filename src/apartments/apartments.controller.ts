import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { User } from "../database/schema";
import { ApartmentsService } from "./apartments.service";

@ApiTags("Apartments")
@ApiBearerAuth()
@Controller("apartments")
@UseGuards(JwtAuthGuard)
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Get("my")
  @ApiOperation({ summary: "Get current user apartment info" })
  async getMyApartment(@CurrentUser() user: User) {
    return this.apartmentsService.getMyApartment(user);
  }
}
