import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { eq } from "drizzle-orm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { db } from "../database/database";
import { users } from "../database/schema";

interface JwtPayload {
  sub: string; // Neon Auth user ID
  email: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("NEON_AUTH_JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: neonAuthId, email } = payload;

    // Find or create user in database
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.neonAuthId, neonAuthId));

    if (!user) {
      // First time login - create user
      [user] = await db
        .insert(users)
        .values({
          neonAuthId,
          email,
          role: "resident",
        })
        .returning();
    }

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return user;
  }
}
