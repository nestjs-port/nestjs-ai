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

import { ChatModel, OpenAiApi } from "../api";
import { OpenAiChatModel } from "../open-ai-chat-model";
import { OpenAiChatOptions } from "../open-ai-chat-options";

export class OpenAiTestConfiguration {
  private readonly _openAiApi: OpenAiApi;
  private readonly _chatModel: OpenAiChatModel;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY ?? "";

    this._openAiApi = OpenAiApi.builder().apiKey(apiKey).build();
    this._chatModel = OpenAiChatModel.builder()
      .openAiApi(this._openAiApi)
      .defaultOptions(
        new OpenAiChatOptions({
          model: ChatModel.GPT_4_O_MINI,
        }),
      )
      .build();
  }

  get openAiApi(): OpenAiApi {
    return this._openAiApi;
  }

  get chatModel(): OpenAiChatModel {
    return this._chatModel;
  }
}
