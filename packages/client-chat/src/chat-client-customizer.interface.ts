import type { ChatClient } from "./chat-client";

/**
 * Callback type that can be used to customize a ChatClient.Builder.
 */
export type ChatClientCustomizer = (
  chatClientBuilder: ChatClient.Builder,
) => void;
