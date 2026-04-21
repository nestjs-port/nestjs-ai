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

import { ObservabilityHelper } from "@nestjs-ai/commons";
import type { Message } from "@nestjs-ai/model";
import type { ObservationContext, ObservationHandler } from "@nestjs-port/core";
import { LoggerFactory } from "@nestjs-port/core";
import { ChatClientObservationContext } from "./chat-client-observation-context";

export class ChatClientPromptContentObservationHandler
  implements ObservationHandler<ChatClientObservationContext>
{
  private readonly logger = LoggerFactory.getLogger(
    ChatClientPromptContentObservationHandler.name,
  );

  onStop(context: ChatClientObservationContext): void {
    this.logger.info(
      `Chat Client Prompt Content:\n${ObservabilityHelper.concatenateEntries(this.processPrompt(context))}`,
    );
  }

  private processPrompt(
    context: ChatClientObservationContext,
  ): Record<string, unknown> {
    const instructions = context.request.prompt.instructions;
    if (instructions.length === 0) {
      return {};
    }

    const messages: Record<string, unknown> = {};
    instructions.forEach((message: Message) => {
      messages[message.messageType.getValue()] = message.text;
    });
    return messages;
  }

  supportsContext(
    context: ObservationContext,
  ): context is ChatClientObservationContext {
    return context instanceof ChatClientObservationContext;
  }
}
