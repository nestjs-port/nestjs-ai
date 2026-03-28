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

import {
  LoggerFactory,
  type ObservationContext,
  type ObservationHandler,
  StringUtils,
} from "@nestjs-ai/commons";
import { ChatClientObservationContext } from "./chat-client-observation-context";

export class ChatClientCompletionObservationHandler
  implements ObservationHandler<ChatClientObservationContext>
{
  private readonly logger = LoggerFactory.getLogger(
    ChatClientCompletionObservationHandler.name,
  );

  onStop(context: ChatClientObservationContext): void {
    this.logger.info(
      `Chat Client Completion:\n${this.concatenateStrings(this.completion(context))}`,
    );
  }

  private completion(context: ChatClientObservationContext): string[] {
    const chatResponse = context.response?.chatResponse;
    if (chatResponse == null) {
      return [];
    }

    return chatResponse.results
      .map((generation) => generation.output.text)
      .filter(StringUtils.hasText);
  }

  supportsContext(
    context: ObservationContext,
  ): context is ChatClientObservationContext {
    return context instanceof ChatClientObservationContext;
  }

  private concatenateStrings(strings: string[]): string {
    const quotedStrings = strings.map((value) => `"${value}"`);
    return `[${quotedStrings.join(", ")}]`;
  }
}
