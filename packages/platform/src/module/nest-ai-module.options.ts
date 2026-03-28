import type { Provider } from "@nestjs/common";
import type {
  ChatClientConfiguration,
  ChatMemoryConfiguration,
  ChatModelConfiguration,
  EmbeddingModelConfiguration,
  HttpClient,
  ObservationConfiguration,
  VectorStoreConfiguration,
} from "@nestjs-ai/commons";

export interface NestAiModuleOptions {
  chatClient?: ChatClientConfiguration;
  chatModel?: ChatModelConfiguration;
  chatMemory?: ChatMemoryConfiguration;
  embeddingModel?: EmbeddingModelConfiguration;
  observation?: ObservationConfiguration;
  vectorStore?: VectorStoreConfiguration;
  httpClient?: HttpClient;
  providers?: Provider[];
  global?: boolean;
}
