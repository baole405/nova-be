import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpStatus,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { GoogleAuthGuard } from "./google-auth.guard";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User successfully registered" })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post("login")
  @ApiOperation({ summary: "User login" })
  @ApiResponse({ status: 200, description: "User successfully logged in" })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, description: "Return current user profile" })
  async getProfile(@Req() req: any) {
    return req.user;
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: "Login with Google" })
  async googleAuth(@Req() req: any) {
    // Guards handle redirection to Google
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: "Google auth callback" })
  async googleAuthRedirect(@Req() req: any) {
    return this.authService.googleLogin(req.user);
  }
}
