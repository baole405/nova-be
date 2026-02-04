import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { eq } from "drizzle-orm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { db } from "../database/database";
import { users } from "../database/schema";

interface JwtPayload {
  sub: number; // User ID
  username: string;
  email: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("NEON_AUTH_JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: userId } = payload;

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
