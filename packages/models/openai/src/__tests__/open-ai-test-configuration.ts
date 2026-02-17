import assert from "node:assert/strict";
import { StringUtils } from "@nestjs-ai/commons";
import { ChatModel, OpenAiApi } from "../api";
import { OpenAiChatModel } from "../open-ai-chat-model";
import { OpenAiChatOptions } from "../open-ai-chat-options";

export class OpenAiTestConfiguration {
  private readonly _openAiApi: OpenAiApi;
  private readonly _chatModel: OpenAiChatModel;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    assert(
      StringUtils.hasText(apiKey),
      "You must provide an API key. Put it in an environment variable under the name OPENAI_API_KEY",
    );

    this._openAiApi = OpenAiApi.builder().apiKey(apiKey).build();
    this._chatModel = new OpenAiChatModel({
      openAiApi: this._openAiApi,
      defaultOptions: new OpenAiChatOptions({
        model: ChatModel.GPT_4_O_MINI,
      }),
    });
  }

  get openAiApi(): OpenAiApi {
    return this._openAiApi;
  }

  get chatModel(): OpenAiChatModel {
    return this._chatModel;
  }
}
