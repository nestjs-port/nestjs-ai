import { AiProvider } from "@nestjs-ai/commons";

export class GoogleGenAiConstants {
  public static readonly PROVIDER_NAME = AiProvider.GOOGLE_GENAI_AI.value;

  private constructor() {}
}
