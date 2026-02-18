import type { ChatClientCustomizer } from "../chat-client-customizer.interface";

export interface ChatClientCustomizerFactoryDefinition {
  useFactory: (...args: unknown[]) => ChatClientCustomizer;
  inject?: unknown[];
}

export type ChatClientCustomizerDefinition =
  | ChatClientCustomizer
  | ChatClientCustomizerFactoryDefinition;

export interface ChatClientBuilderObservationProperties {
  /**
   * Whether to log the prompt content in observations.
   * Default in Java source: false
   */
  logPrompt?: boolean;

  /**
   * Whether to log the completion content in observations.
   * Default in Java source: false
   */
  logCompletion?: boolean;
}

export interface ChatClientBuilderProperties {
  customizer?: ChatClientCustomizerDefinition;

  observations?: ChatClientBuilderObservationProperties;
}
