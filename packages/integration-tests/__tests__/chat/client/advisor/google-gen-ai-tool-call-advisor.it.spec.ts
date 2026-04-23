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
import {
  GoogleGenAiChatModel,
  GoogleGenAiChatOptions,
} from "@nestjs-ai/model-google-genai";
import { beforeAll, describe, expect, it } from "vitest";
import { AbstractToolCallAdvisorIT } from "./abstract-tool-call-advisor.it-shared";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";

const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;

describe.skipIf(!GOOGLE_CLOUD_PROJECT)("GoogleGenAiToolCallAdvisorIT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  let abstractIT: AbstractToolCallAdvisorIT;

  beforeAll(() => {
    const genAiClient = new GoogleGenAI({
      project: GOOGLE_CLOUD_PROJECT ?? "",
      location: "global",
      vertexai: true,
    });

    abstractIT = new AbstractToolCallAdvisorIT(
      new GoogleGenAiChatModel({
        genAiClient,
        defaultOptions: new GoogleGenAiChatOptions({
          model: GoogleGenAiChatModel.ChatModel.GEMINI_3_PRO_PREVIEW,
        }),
      }),
    );
  });

  describe("CallTests", () => {
    it("call multiple tool invocations", async () => {
      await abstractIT.testCallMultipleToolInvocations();
    });

    it("call multiple tool invocations with external memory", async () => {
      await abstractIT.testCallMultipleToolInvocationsWithExternalMemory();
    });

    it("call default advisor configuration", async () => {
      await abstractIT.testCallDefaultAdvisorConfiguration();
    });

    it("call default advisor configuration with external memory", async () => {
      await abstractIT.testCallDefaultAdvisorConfigurationWithExternalMemory();
    });

    it("call with return direct", async () => {
      await abstractIT.testCallWithReturnDirect();
    });
  });

  describe("StreamTests", () => {
    it("stream multiple tool invocations", async () => {
      await abstractIT.testStreamMultipleToolInvocations();
    });

    it("stream multiple tool invocations with external memory", async () => {
      await abstractIT.testStreamMultipleToolInvocationsWithExternalMemory();
    });

    it("stream default advisor configuration", async () => {
      await abstractIT.testStreamDefaultAdvisorConfiguration();
    });

    it("stream default advisor configuration with external memory", async () => {
      await abstractIT.testStreamDefaultAdvisorConfigurationWithExternalMemory();
    });

    it.skipIf(true)("stream with default advisor configuration 1", async () => {
      expect.hasAssertions();
      await abstractIT.testStreamDefaultAdvisorConfiguration();
    });

    it("stream with return direct", async () => {
      await abstractIT.testStreamWithReturnDirect();
    });
  });
});
