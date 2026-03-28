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

import type { Media } from "@nestjs-ai/commons";
import type { Message } from "../messages";
import { AssistantMessage } from "../messages";
import type { ChatOptions } from "./chat-options.interface";
import { Prompt } from "./prompt";
import { PromptTemplate } from "./prompt-template";

export class AssistantPromptTemplate extends PromptTemplate {
  constructor(template: string);
  constructor(resource: Buffer);
  constructor(templateOrResource: string | Buffer) {
    super(templateOrResource as string);
  }

  override createMessage(): Message;
  override createMessage(mediaList: Media[]): Message;
  override createMessage(model: Record<string, unknown>): Message;
  override createMessage(
    mediaListOrModel?: Media[] | Record<string, unknown>,
  ): Message {
    if (mediaListOrModel == null) {
      return AssistantMessage.of(this.render());
    }
    // Media[] case — delegate to parent (UserMessage-based)
    if (Array.isArray(mediaListOrModel)) {
      return super.createMessage(mediaListOrModel);
    }
    return AssistantMessage.of(this.render(mediaListOrModel));
  }

  override create(): Prompt;
  override create(modelOptions: ChatOptions): Prompt;
  override create(model: Record<string, unknown>): Prompt;
  override create(
    model: Record<string, unknown>,
    modelOptions: ChatOptions,
  ): Prompt;
  override create(
    modelOrOptions?: Record<string, unknown> | ChatOptions,
    modelOptions?: ChatOptions,
  ): Prompt {
    // create()
    if (modelOrOptions == null && modelOptions == null) {
      return new Prompt(AssistantMessage.of(this.render()));
    }
    // create(model, modelOptions) — delegate to parent
    if (modelOrOptions != null && modelOptions != null) {
      return super.create(
        modelOrOptions as Record<string, unknown>,
        modelOptions,
      );
    }
    // create(ChatOptions) — delegate to parent
    if (modelOrOptions != null && this.isChatOptions(modelOrOptions)) {
      return super.create(modelOrOptions);
    }
    // create(model)
    return new Prompt(
      AssistantMessage.of(
        this.render(modelOrOptions as Record<string, unknown>),
      ),
    );
  }
}
