import type {
  ChatClientConfiguration,
  ChatModelConfiguration,
  HttpClient,
} from "@nestjs-ai/commons";

export interface NestAIModuleOptions {
  chatClient?: ChatClientConfiguration;
  chatModel?: ChatModelConfiguration;
  httpClient?: HttpClient;
  global?: boolean;
}
