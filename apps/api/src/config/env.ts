import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  RIOT_API_KEY: z.string().min(1),
  RIOT_PLATFORM: z.string().default('la2'),
  RIOT_REGION: z.string().default('americas'),
  PORT: z.coerce.number().default(8787),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  BETA_ACCESS_CODE: z.string().optional(),
  DEFAULT_GAME_NAME: z.string().optional(),
  DEFAULT_TAG_LINE: z.string().optional(),
  MATCH_COUNT: z.coerce.number().default(100),
  RIOT_REQUEST_DELAY_MS: z.coerce.number().default(700),
  RIOT_MAX_RETRIES: z.coerce.number().default(4)
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  corsOrigins: parsed.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
};
