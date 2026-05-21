import type { ModelRequest } from "../model/model-request.interface.js";
import { ModerationMessage } from "./moderation-message.js";
import type { ModerationOptions } from "./moderation-options.js";
import { ModerationOptionsBuilder } from "./moderation-options-builder.js";

/**
 * Represents a prompt for moderation containing a single message and the options for the
 * moderation model. This class offers constructors to create a prompt from a single
 * message or a simple instruction string, allowing for customization of moderation
 * options through `ModerationOptions`. It simplifies creating moderation requests for
 * different use cases.
 */
export class ModerationPrompt implements ModelRequest<ModerationMessage> {
  private readonly _message: ModerationMessage;
  private _moderationModelOptions: ModerationOptions;

  constructor(
    message: ModerationMessage,
    moderationModelOptions: ModerationOptions,
  );
  constructor(instructions: string, moderationOptions: ModerationOptions);
  constructor(instructions: string);
  constructor(
    messageOrInstructions: ModerationMessage | string,
    moderationModelOptions?: ModerationOptions,
  ) {
    if (typeof messageOrInstructions === "string") {
      this._message = new ModerationMessage(messageOrInstructions);
      this._moderationModelOptions =
        moderationModelOptions ?? ModerationOptionsBuilder.builder().build();
      return;
    }

    this._message = messageOrInstructions;
    this._moderationModelOptions =
      moderationModelOptions ?? ModerationOptionsBuilder.builder().build();
  }

  get instructions(): ModerationMessage {
    return this._message;
  }

  get options(): ModerationOptions {
    return this._moderationModelOptions;
  }

  setOptions(moderationModelOptions: ModerationOptions): void {
    this._moderationModelOptions = moderationModelOptions;
  }
}
