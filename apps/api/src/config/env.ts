import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  RIOT_API_KEY: z.string().min(1),
  RIOT_PLATFORM: z.string().default('la2'),
  RIOT_REGION: z.string().default('americas'),
  PORT: z.coerce.number().default(8787),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  BETA_ACCESS_CODE: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  OPENAI_ECONOMY_MODEL: z.string().optional(),
  OPENAI_PREMIUM_MODEL: z.string().optional(),
  OPENAI_VECTOR_STORE_ID: z.string().optional(),
  AI_COACH_MONTHLY_BUDGET_USD: z.coerce.number().default(1.5),
  AI_COACH_MAX_MONTHLY_OPENAI_RUNS: z.coerce.number().default(60),
  AI_COACH_MAX_MONTHLY_PREMIUM_RUNS: z.coerce.number().default(10),
  AI_COACH_PREMIUM_MIN_NEW_MATCHES: z.coerce.number().default(4),
  AI_COACH_PREMIUM_MIN_VISIBLE_MATCHES: z.coerce.number().default(12),
  AI_COACH_PREMIUM_MIN_REMAINING_BUDGET_USD: z.coerce.number().default(0.5),
  CURRENT_LOL_PATCH: z.string().optional(),
  PATCH_NOTES_AUTO_SYNC: z.coerce.boolean().default(true),
  PATCH_NOTES_SYNC_INTERVAL_HOURS: z.coerce.number().default(12),
  PATCH_NOTES_TAG_URL: z.string().default('https://www.leagueoflegends.com/en-us/news/tags/patch-notes/'),
  DEFAULT_GAME_NAME: z.string().optional(),
  DEFAULT_TAG_LINE: z.string().optional(),
  MATCH_COUNT: z.coerce.number().default(100),
  RIOT_REQUEST_DELAY_MS: z.coerce.number().default(700),
  RIOT_MAX_RETRIES: z.coerce.number().default(4)
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  openAIEconomyModel: parsed.OPENAI_ECONOMY_MODEL ?? parsed.OPENAI_MODEL,
  openAIPremiumModel: parsed.OPENAI_PREMIUM_MODEL ?? (parsed.OPENAI_MODEL === 'gpt-4.1-nano' ? 'gpt-4.1-mini' : parsed.OPENAI_MODEL),
  corsOrigins: parsed.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
};
