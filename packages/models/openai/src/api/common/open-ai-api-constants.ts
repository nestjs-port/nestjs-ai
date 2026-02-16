import { AiProvider } from "@nestjs-ai/commons";

/**
 * Common value constants for OpenAI api.
 */
export class OpenAiApiConstants {
  static readonly DEFAULT_BASE_URL = "https://api.openai.com";

  static readonly PROVIDER_NAME = AiProvider.OPENAI.value;

  private constructor() {
    // Prevent instantiation
  }
}
