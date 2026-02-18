import type { ChatModelConfiguration, HttpClient } from "@nestjs-ai/commons";

export interface NestAIModuleOptions {
  chatModel?: ChatModelConfiguration;
  httpClient?: HttpClient;
}
