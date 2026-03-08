import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { db } from "../database/database";
import {
  apartmentFeeConfigs,
  billItems,
  feeTypes,
  User,
} from "../database/schema";
import { CreateFeeTypeDto } from "./dto/create-fee-type.dto";
import { UpdateFeeTypeDto } from "./dto/update-fee-type.dto";

@Injectable()
export class FeeTypesService {
  async findAll() {
    return db.select().from(feeTypes).orderBy(asc(feeTypes.name));
  }

  async findOne(id: number) {
    const [feeType] = await db
      .select()
      .from(feeTypes)
      .where(eq(feeTypes.id, id));

    if (!feeType) {
      throw new NotFoundException("Loại phí không tồn tại");
    }

    return feeType;
  }

  async create(user: User, dto: CreateFeeTypeDto) {
    if (user.role !== "manager") {
      throw new ForbiddenException("Chỉ quản lý mới có quyền tạo loại phí");
    }

    const [created] = await db.insert(feeTypes).values(dto).returning();
    return created;
  }

  async update(user: User, id: number, dto: UpdateFeeTypeDto) {
    if (user.role !== "manager") {
      throw new ForbiddenException(
        "Chỉ quản lý mới có quyền cập nhật loại phí",
      );
    }

    await this.findOne(id);

    const [updated] = await db
      .update(feeTypes)
      .set(dto)
      .where(eq(feeTypes.id, id))
      .returning();

    return updated;
  }

  async remove(user: User, id: number) {
    if (user.role !== "manager") {
      throw new ForbiddenException("Chỉ quản lý mới có quyền xóa loại phí");
    }

    await this.findOne(id);

    const billItemRefs = await db
      .select({ id: billItems.id })
      .from(billItems)
      .where(eq(billItems.feeTypeId, id));

    if (billItemRefs.length > 0) {
      throw new ConflictException(
        "Không thể xóa loại phí đang được sử dụng",
      );
    }

    const configRefs = await db
      .select({ id: apartmentFeeConfigs.id })
      .from(apartmentFeeConfigs)
      .where(eq(apartmentFeeConfigs.feeTypeId, id));

    if (configRefs.length > 0) {
      throw new ConflictException(
        "Không thể xóa loại phí đang được sử dụng",
      );
    }

    await db.delete(feeTypes).where(eq(feeTypes.id, id));

    return { message: "Đã xóa loại phí thành công" };
  }
}
