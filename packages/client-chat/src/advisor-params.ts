import type { ChatClient } from "./chat-client";
import { ChatClientAttributes } from "./chat-client-attributes";

/**
 * Configuration options for ChatClient requests.
 * Preset advisor parameters that can be passed as configuration options
 * to the advisor context.
 */
export abstract class AdvisorParams {
  static readonly ENABLE_NATIVE_STRUCTURED_OUTPUT = (
    advisorSpec: ChatClient.AdvisorSpec,
  ): void => {
    advisorSpec.param(ChatClientAttributes.STRUCTURED_OUTPUT_NATIVE.key, true);
  };
}
