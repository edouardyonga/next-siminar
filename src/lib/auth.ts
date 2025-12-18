import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { env } from "./env";

const TOKEN_TTL_HOURS = 12;

export type AuthUser = {
  email: string;
  role: "admin";
};

const adminPasswordHash = bcrypt.hashSync(env.ADMIN_PASSWORD, 10);

export async function verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
  const isMatch = email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() && (await bcrypt.compare(password, adminPasswordHash));
  if (!isMatch) return null;
  return { email: env.ADMIN_EMAIL, role: "admin" };
}

export async function signSession(user: AuthUser) {
  const secret = new TextEncoder().encode(env.AUTH_SECRET);
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ sub: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(`${TOKEN_TTL_HOURS}h`)
    .sign(secret);
}

