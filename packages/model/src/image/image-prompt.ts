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

import assert from "node:assert/strict";

import type { ModelRequest } from "../model";
import { ImageMessage } from "./image-message";
import type { ImageOptions } from "./image-options";
import { ImageOptionsBuilder } from "./image-options-builder";

export class ImagePrompt implements ModelRequest<ImageMessage[]> {
  private readonly _messages: ImageMessage[];
  private readonly _imageModelOptions: ImageOptions | null;

  constructor(messages: ImageMessage[]);
  constructor(messages: ImageMessage[], imageModelOptions: ImageOptions | null);
  constructor(imageMessage: ImageMessage, imageOptions: ImageOptions | null);
  constructor(instructions: string, imageOptions: ImageOptions | null);
  constructor(instructions: string);
  constructor(
    messagesOrInstruction: ImageMessage[] | ImageMessage | string,
    imageModelOptions: ImageOptions | null = null,
  ) {
    assert(
      messagesOrInstruction != null,
      "messages or instructions cannot be null",
    );

    if (typeof messagesOrInstruction === "string") {
      this._messages = [new ImageMessage(messagesOrInstruction)];
      this._imageModelOptions =
        imageModelOptions ?? ImageOptionsBuilder.builder().build();
      return;
    }

    if (Array.isArray(messagesOrInstruction)) {
      this._messages = messagesOrInstruction;
      this._imageModelOptions = imageModelOptions;
      return;
    }

    this._messages = [messagesOrInstruction];
    this._imageModelOptions = imageModelOptions;
  }

  get instructions(): ImageMessage[] {
    return this._messages;
  }

  get options(): ImageOptions | null {
    return this._imageModelOptions;
  }
}
