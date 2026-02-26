import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { TokenError } from "passport-oauth2";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>("GOOGLE_CLIENT_ID"),
      clientSecret: configService.get<string>("GOOGLE_CLIENT_SECRET"),
      callbackURL: configService.get<string>("GOOGLE_CALLBACK_URL"),
      scope: ["email", "profile"],
      tokenURL: "https://oauth2.googleapis.com/token",
    });

    this.logger.log(
      `Google OAuth callbackURL: ${configService.get<string>("GOOGLE_CALLBACK_URL")}`,
    );
  }

  parseErrorResponse(body: string, status: number): Error | null {
    try {
      const json = JSON.parse(body);
      if (json.error) {
        this.logger.error(
          `Google token exchange failed [${status}]: ${json.error} — ${json.error_description || "no description"}`,
        );
        return new TokenError(
          json.error_description || json.error,
          json.error,
          json.error_uri,
        );
      }
    } catch {
      this.logger.error(`Google token exchange returned unparseable response [${status}]: ${body}`);
    }
    return null;
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user = {
      googleId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      fullName: `${name.givenName} ${name.familyName}`,
      picture: photos[0].value,
      accessToken,
    };

    done(null, user);
  }
}
