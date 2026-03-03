import type { Provider } from "@nestjs/common";
import type {
  ChatClientConfiguration,
  ChatModelConfiguration,
  HttpClient,
  ObservationConfiguration,
} from "@nestjs-ai/commons";

export interface NestAiModuleOptions {
  chatClient?: ChatClientConfiguration;
  chatModel?: ChatModelConfiguration;
  observation?: ObservationConfiguration;
  httpClient?: HttpClient;
  providers?: Provider[];
  global?: boolean;
}
