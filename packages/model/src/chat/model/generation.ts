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
import type { ModelResult } from "../../model/index.js";
import type { AssistantMessage } from "../messages/index.js";
import { ChatGenerationMetadata } from "../metadata/index.js";

/**
 * Properties for creating a Generation instance.
 */
export interface GenerationProps {
  assistantMessage: AssistantMessage;
  chatGenerationMetadata?: ChatGenerationMetadata;
}

/**
 * Represents a response returned by the AI.
 */
export class Generation implements ModelResult<AssistantMessage> {
  private readonly _assistantMessage: AssistantMessage;
  private readonly _chatGenerationMetadata: ChatGenerationMetadata;

  constructor(props: GenerationProps) {
    assert(props.assistantMessage, "AssistantMessage must not be null");
    this._assistantMessage = props.assistantMessage;
    this._chatGenerationMetadata =
      props.chatGenerationMetadata ?? ChatGenerationMetadata.NULL;
  }

  get output(): AssistantMessage {
    return this._assistantMessage;
  }

  get metadata(): ChatGenerationMetadata {
    return this._chatGenerationMetadata;
  }
}
