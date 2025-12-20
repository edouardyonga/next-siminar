import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_BASE_URL: z.string().url().optional(),
  AUTH_SECRET: z.string().min(16),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  MAIL_HOST: z.string().default("localhost"),
  MAIL_PORT: z.string().default("1025"),
  MAIL_FROM: z.string().email().default("seminars@example.com"),
});

export const env = envSchema.parse(process.env);

