import { Inject } from "@nestjs/common";
import {
  CHAT_CLIENT_BUILDER_TOKEN,
  CHAT_CLIENT_CUSTOMIZER_TOKEN,
  CHAT_MODEL_TOKEN,
  HTTP_CLIENT_TOKEN,
  OBSERVATION_REGISTRY_TOKEN,
} from "@nestjs-ai/commons";

/**
 * Decorator that injects the chat model instance.
 */
export const InjectChatModel = (): ParameterDecorator =>
  Inject(CHAT_MODEL_TOKEN);

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
