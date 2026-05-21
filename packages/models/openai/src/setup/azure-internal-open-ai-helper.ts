import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from "@azure/identity";

/**
 * Specific configuration for authenticating on Azure. This is in a separate class to
 * avoid needing the Azure SDK dependencies when not using Azure as a platform.
 *
 * This code is inspired by LangChain4j's
 * `dev.langchain4j.model.openaiofficial.AzureInternalOpenAiOfficialHelper` class, which
 * is coded by the same author (Julien Dubois, from Microsoft).
 */
export abstract class AzureInternalOpenAiHelper {
  private constructor() {}

  static getAzureCredential(): () => Promise<string> {
    return getBearerTokenProvider(
      new DefaultAzureCredential(),
      "https://cognitiveservices.azure.com/.default",
    );
  }
}
