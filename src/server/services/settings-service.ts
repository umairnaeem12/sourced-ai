import { isAdminPublic } from "../auth/admin-access";
import { SESSION_HOURS } from "../auth/admin-session";
import { loadConfig, type AppConfig } from "../config";
import { CHANNELS, enabledChannels } from "../notifications/handoff-notifiers";
import { isAllowedWebhookUrl } from "../notifications/webhook-notifier";
import type { NotificationChannel } from "../repositories/handoff-repository";

// Spec 005 B27. "log_only": email is on, but without RESEND_API_KEY it's written to the server log (development).
export type ChannelState = "connected" | "log_only" | "missing_settings" | "turned_off" | "not_set_up";

export interface ChannelSettings {
  channel: NotificationChannel;
  state: ChannelState;
  missing: string[];
  // Where alerts go, without secrets: a host or the owner's own inbox.
  target: string | null;
  signed: boolean | null;
}

export interface SettingsView {
  store: { name: string; time_zone: string };
  answers: {
    provider: string;
    model: string | null;
    fallback: { provider: string; model: string } | null;
    embedding_model: string;
    min_similarity: number;
    daily_question_limit: number;
  };
  alerts: ChannelSettings[];
  admin: { session_hours: number; password_set: boolean; public_access: boolean };
}

const MODEL_OF: Record<AppConfig["AI_PROVIDER"], (config: AppConfig) => string | undefined> = {
  gemini: (config) => config.GEMINI_MODEL,
  groq: (config) => config.GROQ_MODEL,
  openai: (config) => config.OPENAI_MODEL,
  anthropic: (config) => config.ANTHROPIC_MODEL,
};

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

interface Requirement {
  missing: string[];
  target: string | null;
  signed: boolean | null;
  hasAnySetting: boolean;
}

function requirementsOf(channel: NotificationChannel, config: AppConfig): Requirement {
  switch (channel) {
    case "slack": {
      const url = config.SLACK_WEBHOOK_URL;
      const valid = url?.startsWith("https://hooks.slack.com/") ?? false;
      return { missing: valid ? [] : ["SLACK_WEBHOOK_URL"], target: valid ? hostOf(url) : null, signed: null, hasAnySetting: Boolean(url) };
    }
    case "email": {
      const missing = [...(config.HANDOFF_EMAIL_TO ? [] : ["HANDOFF_EMAIL_TO"]), ...(config.RESEND_API_KEY ? [] : ["RESEND_API_KEY"])];
      return {
        missing,
        target: config.HANDOFF_EMAIL_TO ?? null,
        signed: null,
        hasAnySetting: Boolean(config.HANDOFF_EMAIL_TO || config.RESEND_API_KEY),
      };
    }
    case "webhook": {
      const url = config.HANDOFF_WEBHOOK_URL;
      const valid = url ? isAllowedWebhookUrl(url) : false;
      return {
        missing: valid ? [] : ["HANDOFF_WEBHOOK_URL"],
        target: valid ? hostOf(url) : null,
        signed: valid ? Boolean(config.HANDOFF_WEBHOOK_SECRET) : null,
        hasAnySetting: Boolean(url),
      };
    }
  }
}

export function channelSettings(channel: NotificationChannel, config: AppConfig, isProduction: boolean): ChannelSettings {
  const enabled = enabledChannels(config).includes(channel);
  const { missing, target, signed, hasAnySetting } = requirementsOf(channel, config);
  const onlyKeyMissing = channel === "email" && missing.length === 1 && missing[0] === "RESEND_API_KEY";

  let state: ChannelState;
  if (!enabled) state = hasAnySetting ? "turned_off" : "not_set_up";
  else if (missing.length === 0) state = "connected";
  else if (onlyKeyMissing && !isProduction) state = "log_only";
  else state = "missing_settings";

  return { channel, state, missing, target, signed };
}

export class SettingsService {
  constructor(
    private readonly config: () => AppConfig,
    private readonly isProduction: () => boolean,
  ) {}

  view(): SettingsView {
    const config = this.config();
    const groqFallback = config.AI_PROVIDER !== "groq" && Boolean(config.GROQ_API_KEY);
    return {
      store: { name: config.STORE_NAME, time_zone: config.STORE_TIMEZONE },
      answers: {
        provider: config.AI_PROVIDER,
        model: MODEL_OF[config.AI_PROVIDER](config) ?? null,
        fallback: groqFallback ? { provider: "groq", model: config.GROQ_MODEL } : null,
        embedding_model: config.GEMINI_EMBEDDING_MODEL,
        min_similarity: config.MIN_SIMILARITY,
        daily_question_limit: config.DAILY_QUESTION_LIMIT,
      },
      alerts: CHANNELS.map((channel) => channelSettings(channel, config, this.isProduction())),
      admin: { session_hours: SESSION_HOURS, password_set: Boolean(config.ADMIN_PASSWORD), public_access: isAdminPublic({ ADMIN_PUBLIC: config.ADMIN_PUBLIC }) },
    };
  }

  channel(channel: NotificationChannel): ChannelSettings {
    return channelSettings(channel, this.config(), this.isProduction());
  }
}

export const settingsService = new SettingsService(
  () => loadConfig(),
  () => process.env.NODE_ENV === "production",
);
