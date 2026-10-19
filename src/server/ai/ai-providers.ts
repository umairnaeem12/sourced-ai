import type { AppConfig } from "../config";
import type { AiProvider } from "./ai-provider";
import { AnthropicProvider } from "./anthropic-provider";
import { GeminiProvider } from "./gemini-provider";
import { OpenAiCompatibleProvider } from "./openai-compatible-provider";

function groq(config: AppConfig): AiProvider {
  return new OpenAiCompatibleProvider({
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: config.GROQ_API_KEY,
    apiKeyName: "GROQ_API_KEY",
    model: config.GROQ_MODEL,
    modelName: "GROQ_MODEL",
  });
}

function primary(config: AppConfig): AiProvider {
  switch (config.AI_PROVIDER) {
    case "gemini":
      return new GeminiProvider(config.GEMINI_API_KEY, config.GEMINI_MODEL);
    case "groq":
      return groq(config);
    case "openai":
      return new OpenAiCompatibleProvider({
        name: "openai",
        baseUrl: "https://api.openai.com/v1",
        apiKey: config.OPENAI_API_KEY,
        apiKeyName: "OPENAI_API_KEY",
        model: config.OPENAI_MODEL,
        modelName: "OPENAI_MODEL",
      });
    case "anthropic":
      return new AnthropicProvider(config.ANTHROPIC_API_KEY, config.ANTHROPIC_MODEL);
  }
}

// Primary first; Groq second when it has a key and isn't already the primary.
export function createAiProviders(config: AppConfig): AiProvider[] {
  const providers = [primary(config)];
  if (config.AI_PROVIDER !== "groq" && config.GROQ_API_KEY) providers.push(groq(config));
  return providers;
}
