import type { ChatClientResponse } from "../chat-client-response";

export abstract class AdvisorUtils {
  static onFinishReason(): (chatClientResponse: ChatClientResponse) => boolean {
    return (chatClientResponse: ChatClientResponse) =>
      chatClientResponse.chatResponse?.results?.some(
        (result) => (result?.metadata?.finishReason?.trim()?.length ?? 0) > 0,
      ) ?? false;
  }
}
