import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GoogleAuthGuard extends AuthGuard("google") {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  getAuthenticateOptions(_context: ExecutionContext) {
    return { session: false };
  }

  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    _context: ExecutionContext,
  ): TUser {
    if (err) {
      this.logger.error(
        `Google OAuth failed: ${err.message} (code: ${err.code || "unknown"})`,
        err.stack,
      );
      throw new UnauthorizedException(
        `Google authentication failed: ${err.message}`,
      );
    }

    if (!user) {
      this.logger.warn("Google OAuth returned no user");
      throw new UnauthorizedException(
        "Google authentication failed: no user returned",
      );
    }

    return user;
  }
}
