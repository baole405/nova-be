import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { User } from "../database/schema";
import { CreateFeeTypeDto } from "./dto/create-fee-type.dto";
import { UpdateFeeTypeDto } from "./dto/update-fee-type.dto";
import { FeeTypesService } from "./fee-types.service";

@ApiTags("Fee Types")
@ApiBearerAuth()
@Controller("fee-types")
@UseGuards(JwtAuthGuard)
export class FeeTypesController {
  constructor(private readonly feeTypesService: FeeTypesService) {}

  @Get()
  @ApiOperation({ summary: "Get all fee types" })
  async findAll() {
    return this.feeTypesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get fee type by ID" })
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.feeTypesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new fee type (manager only)" })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateFeeTypeDto,
  ) {
    return this.feeTypesService.create(user, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a fee type (manager only)" })
  async update(
    @CurrentUser() user: User,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateFeeTypeDto,
  ) {
    return this.feeTypesService.update(user, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a fee type (manager only)" })
  async remove(
    @CurrentUser() user: User,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.feeTypesService.remove(user, id);
  }
}
