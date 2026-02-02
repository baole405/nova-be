import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../database/database";
import { apartments, User, users } from "../database/schema";

@Injectable()
export class ApartmentsService {
  async getMyApartment(user: User) {
    const [apartment] = await db
      .select({
        id: apartments.id,
        unitNumber: apartments.unitNumber,
        floor: apartments.floorNumber,
        block: apartments.blockName,
        areaSqm: apartments.areaSqm,
        owner: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
      })
      .from(apartments)
      .leftJoin(users, eq(apartments.ownerId, users.id))
      .where(eq(apartments.ownerId, user.id));

    if (!apartment) {
      throw new NotFoundException("Apartment not found");
    }

    return apartment;
  }
}
