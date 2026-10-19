import { z } from "zod";

// `KEY=` in .env arrives as an empty string; treat it as unset.
const optionalString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const envSchema = z.object({
  AI_PROVIDER: z.enum(["gemini", "groq", "openai", "anthropic"]).default("gemini"),
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  GEMINI_EMBEDDING_MODEL: z.string().default("gemini-embedding-2"),
  GROQ_API_KEY: optionalString,
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  MIN_SIMILARITY: z.coerce.number().min(0).max(1).default(0.55),
  // Questions per day across all visitors, to stay inside free-tier AI quotas.
  DAILY_QUESTION_LIMIT: z.coerce.number().int().positive().default(500),
  STORE_NAME: z.string().default("Pinebrook Supply"),
  // Spec 005: admin charts bucket days and hours in the store's own time zone.
  STORE_TIMEZONE: z
    .string()
    .default("America/New_York")
    .refine((zone) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    }, "STORE_TIMEZONE must be an IANA time zone, e.g. America/New_York"),
  // Checked by the Slack client, so a bad URL fails handoffs only, not the whole app.
  SLACK_WEBHOOK_URL: optionalString,
  ADMIN_PASSWORD: optionalString,
  // Spec 005 amendment: "true" opens every admin page and action without signing in (public demo).
  ADMIN_PUBLIC: optionalString,
  // Comma list of slack, email, webhook. Empty: handoffs go to the admin inbox only.
  HANDOFF_NOTIFY: optionalString,
  RESEND_API_KEY: optionalString,
  HANDOFF_EMAIL_TO: optionalString,
  // Resend's shared sender, for testing only; use an address on a verified domain in production.
  HANDOFF_EMAIL_FROM: z.string().default("onboarding@resend.dev"),
  HANDOFF_EMAIL_FROM_NAME: z.string().default("Sourced AI"),
  HANDOFF_WEBHOOK_URL: optionalString,
  HANDOFF_WEBHOOK_SECRET: optionalString,
  // Used for links in notifications, e.g. the inbox link in the handoff email.
  APP_URL: z.string().default("http://localhost:3100"),
  // Spec 005: requests carrying this in x-sourced-test are test traffic, hidden from the admin.
  E2E_TRAFFIC_TOKEN: optionalString,
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
