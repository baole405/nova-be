import { config } from "dotenv";
import { sign } from "jsonwebtoken";
config();

const SECRET = process.env.NEON_AUTH_JWT_SECRET;
const PAYLOAD = {
  sub: "sample-neon-auth-id-123",
  email: "demo@nova.com",
  name: "Nguyễn Văn A",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
};

if (!SECRET) {
  console.error("❌ NEON_AUTH_JWT_SECRET is not set in .env");
  process.exit(1);
}

const token = sign(PAYLOAD, SECRET);
console.log("generated_token:", token);
