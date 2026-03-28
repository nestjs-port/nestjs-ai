import { Inject } from "@nestjs/common";
import {
  CHAT_CLIENT_BUILDER_TOKEN,
  CHAT_CLIENT_CUSTOMIZER_TOKEN,
  CHAT_MEMORY_TOKEN,
  CHAT_MODEL_TOKEN,
  EMBEDDING_MODEL_TOKEN,
  HTTP_CLIENT_TOKEN,
  OBSERVATION_REGISTRY_TOKEN,
  VECTOR_STORE_TOKEN,
} from "@nestjs-ai/commons";

/**
 * Decorator that injects the chat model instance.
 */
export const InjectChatModel = (): ParameterDecorator =>
  Inject(CHAT_MODEL_TOKEN);

/**
 * Decorator that injects the chat memory instance.
 */
export const InjectChatMemory = (): ParameterDecorator =>
  Inject(CHAT_MEMORY_TOKEN);

/**
 * Decorator that injects the embedding model instance.
 */
export const InjectEmbeddingModel = (): ParameterDecorator =>
  Inject(EMBEDDING_MODEL_TOKEN);

/**
 * Decorator that injects the chat client builder instance.
 */
export const InjectChatClientBuilder = (): ParameterDecorator =>
  Inject(CHAT_CLIENT_BUILDER_TOKEN);

/**
 * Decorator that injects chat client customizers.
 */
export const InjectChatClientCustomizer = (): ParameterDecorator =>
  Inject(CHAT_CLIENT_CUSTOMIZER_TOKEN);

/**
 * Decorator that injects the HTTP client instance.
 */
export const InjectHttpClient = (): ParameterDecorator =>
  Inject(HTTP_CLIENT_TOKEN);

/**
 * Decorator that injects the observation registry instance.
 */
export const InjectObservationRegistry = (): ParameterDecorator =>
  Inject(OBSERVATION_REGISTRY_TOKEN);

/**
 * Decorator that injects the vector store instance.
 */
export const InjectVectorStore = (): ParameterDecorator =>
  Inject(VECTOR_STORE_TOKEN);
