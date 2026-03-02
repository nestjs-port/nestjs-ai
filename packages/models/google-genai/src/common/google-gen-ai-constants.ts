import { AiProvider } from "@nestjs-ai/commons";

export abstract class GoogleGenAiConstants {
  public static readonly PROVIDER_NAME = AiProvider.GOOGLE_GENAI_AI.value;
}
