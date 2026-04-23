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

import type { Observable } from "rxjs";
import type { Model } from "../../model/index.js";
import type { Message } from "../messages/index.js";
import {
  type ChatOptions,
  DefaultChatOptions,
  Prompt,
} from "../prompt/index.js";
import type { ChatResponse } from "./chat-response.js";
import { StreamingChatModel } from "./streaming-chat-model.js";

export abstract class ChatModel
  extends StreamingChatModel
  implements Model<Prompt, ChatResponse>
{
  call(message: string): Promise<string | null>;
  call(...messages: Message[]): Promise<string | null>;
  call(prompt: Prompt): Promise<ChatResponse>;
  async call(
    promptOrMessage: Prompt | string | Message,
    ...messages: Message[]
  ): Promise<ChatResponse | string | null> {
    if (promptOrMessage instanceof Prompt) {
      return this.callPrompt(promptOrMessage);
    }

    const prompt =
      typeof promptOrMessage === "string"
        ? new Prompt(promptOrMessage)
        : new Prompt([promptOrMessage, ...messages]);

    const generation = (await this.callPrompt(prompt)).result;
    if (!generation) {
      return "";
    }

    return generation.output.text;
  }

  protected abstract callPrompt(prompt: Prompt): Promise<ChatResponse>;

  get defaultOptions(): ChatOptions {
    return new DefaultChatOptions();
  }

  protected override streamPrompt(_prompt: Prompt): Observable<ChatResponse> {
    throw new Error("streaming is not supported");
  }
}
