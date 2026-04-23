/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ModelRequest } from "../model/index.js";
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
