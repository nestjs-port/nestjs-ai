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

import { GoogleGenAI } from "@google/genai";
import { Prompt } from "@nestjs-ai/model";
import { beforeEach, describe, expect, it } from "vitest";
import { GoogleGenAiThinkingLevel } from "../common/index.js";
import { GoogleGenAiChatModel } from "../google-gen-ai-chat-model.js";
import { GoogleGenAiChatOptions } from "../google-gen-ai-chat-options.js";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

describe.skipIf(!GOOGLE_API_KEY)("GoogleGenAiThinkingLevelIT", () => {
  let genAiClient: GoogleGenAI;

  beforeEach(() => {
    genAiClient = new GoogleGenAI({
      apiKey: GOOGLE_API_KEY ?? "",
    });
  });

  it.each([GoogleGenAiThinkingLevel.MINIMAL, GoogleGenAiThinkingLevel.MEDIUM])(
    "test Gemini 3 Pro rejects unsupported levels %s",
    async (level) => {
      const chatModel = new GoogleGenAiChatModel({
        genAiClient,
        defaultOptions: new GoogleGenAiChatOptions({
          model: GoogleGenAiChatModel.ChatModel.GEMINI_3_PRO_PREVIEW,
          thinkingLevel: level,
        }),
      });

      await expect(
        chatModel.call(new Prompt("What is 2+2? Answer with just the number.")),
      ).rejects.toThrow(new RegExp(`ThinkingLevel\\.${level}.*Gemini 3 Pro`));
    },
  );

  it.each([GoogleGenAiThinkingLevel.LOW, GoogleGenAiThinkingLevel.HIGH])(
    "test Gemini 3 Pro accepts supported levels %s",
    async (level) => {
      const chatModel = new GoogleGenAiChatModel({
        genAiClient,
        defaultOptions: new GoogleGenAiChatOptions({
          model: GoogleGenAiChatModel.ChatModel.GEMINI_3_PRO_PREVIEW,
          thinkingLevel: level,
        }),
      });

      const response = await chatModel.call(
        new Prompt("What is 2+2? Answer with just the number."),
      );

      expect(response).not.toBeNull();
      expect(response.result).not.toBeNull();
      expect(response.result?.output.text).toMatch(/\S/);
    },
  );

  it.each([
    GoogleGenAiThinkingLevel.MINIMAL,
    GoogleGenAiThinkingLevel.LOW,
    GoogleGenAiThinkingLevel.MEDIUM,
    GoogleGenAiThinkingLevel.HIGH,
  ])("test Gemini 3 Flash accepts all levels %s", async (level) => {
    const chatModel = new GoogleGenAiChatModel({
      genAiClient,
      defaultOptions: new GoogleGenAiChatOptions({
        model: GoogleGenAiChatModel.ChatModel.GEMINI_3_FLASH_PREVIEW,
        thinkingLevel: level,
      }),
    });

    const response = await chatModel.call(
      new Prompt("What is 2+2? Answer with just the number."),
    );

    expect(response).not.toBeNull();
    expect(response.result).not.toBeNull();
    expect(response.result?.output.text).toMatch(/\S/);
  });
});
