import type { ChatClient } from "./chat-client";

/**
 * Callback interface that can be used to customize a ChatClient.Builder.
 */
export interface ChatClientCustomizer {
  /**
   * Callback to customize a ChatClient.Builder instance.
   */
  customize(chatClientBuilder: ChatClient.Builder): void;
}
