import { z } from "zod";
import { AiUnavailableError, postJson, type AiProvider, type AnswerPrompt } from "./ai-provider";

const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })),
});

interface OpenAiCompatibleOptions {
  name: string;
  baseUrl: string;
  apiKey: string | undefined;
  apiKeyName: string;
  model: string | undefined;
  modelName: string;
}

// Groq and OpenAI share the chat completions format.
export class OpenAiCompatibleProvider implements AiProvider {
  readonly name: string;

  constructor(private readonly options: OpenAiCompatibleOptions) {
    this.name = options.name;
  }

  async generateAnswer(prompt: AnswerPrompt): Promise<string> {
    const { baseUrl, apiKey, apiKeyName, model, modelName } = this.options;
    if (!apiKey) throw new AiUnavailableError(this.name, `${apiKeyName} is not set`);
    if (!model) throw new AiUnavailableError(this.name, `${modelName} is not set`);

    const data = await postJson(
      this.name,
      `${baseUrl}/chat/completions`,
      { authorization: `Bearer ${apiKey}` },
      {
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      },
    );

    const text = completionSchema.parse(data).choices[0]?.message.content;
    if (!text) throw new AiUnavailableError(this.name, "empty response");
    return text;
  }
}
