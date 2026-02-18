import type { ChatClient } from "../chat-client";
import type { ChatClientCustomizer } from "../chat-client-customizer.interface";

export class ChatClientBuilderConfigurer {
  private _customizers: ChatClientCustomizer[] | null = null;

  setChatClientCustomizers(customizers: ChatClientCustomizer[]): void {
    this._customizers = customizers;
  }

  configure(builder: ChatClient.Builder): ChatClient.Builder {
    this.applyCustomizers(builder);
    return builder;
  }

  private applyCustomizers(builder: ChatClient.Builder): void {
    if (this._customizers != null) {
      for (const customizer of this._customizers) {
        customizer(builder);
      }
    }
  }
}
