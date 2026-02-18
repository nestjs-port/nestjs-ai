import type {
  ChatClientConfiguration,
  ChatModelConfiguration,
  HttpClient,
  ObservationConfiguration,
} from "@nestjs-ai/commons";

export interface NestAIModuleOptions {
  chatClient?: ChatClientConfiguration;
  chatModel?: ChatModelConfiguration;
  observation?: ObservationConfiguration;
  httpClient?: HttpClient;
  global?: boolean;
}
