import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { eq, or } from "drizzle-orm";
import * as bcrypt from "bcrypt";
import { db } from "../database/database";
import { users } from "../database/schema";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async register(registerDto: RegisterDto) {
    const { username, email, password, fullName, phoneNumber } = registerDto;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))
      .limit(1);

    if (existingUser.length > 0) {
      if (existingUser[0].username === username) {
        throw new ConflictException("Username already exists");
      }
      if (existingUser[0].email === email) {
        throw new ConflictException("Email already exists");
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
        fullName,
        phoneNumber,
        role: "resident",
      })
      .returning();

    // Generate JWT token
    const token = this.generateToken(newUser);

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;

    return {
      user: userWithoutPassword,
      access_token: token,
    };
  }

  async login(loginDto: LoginDto) {
    const { usernameOrEmail, password } = loginDto;

    // Find user by username or email
    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, usernameOrEmail),
          eq(users.email, usernameOrEmail)
        )
      )
      .limit(1);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token: token,
    };
  }

  private generateToken(user: any): string {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  async validateUser(userId: number) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    fullName: string;
    picture?: string;
  }) {
    const { email, fullName } = googleUser;

    // Check if user exists with this email or Google ID
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let user;

    if (existingUser) {
      // User exists, return token
      user = existingUser;
    } else {
      // Create new user with Google account
      // Generate a username from email (before @)
      const baseUsername = email.split("@")[0];
      let username = baseUsername;
      let counter = 1;

      // Ensure username is unique
      while (true) {
        const [existingUsername] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!existingUsername) break;
        username = `${baseUsername}${counter}`;
        counter++;
      }

      // Create user without password (OAuth user)
      [user] = await db
        .insert(users)
        .values({
          username,
          email,
          password: "", // Empty password for OAuth users
          fullName,
          role: "resident",
        })
        .returning();
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      access_token: token,
    };
  }
}
