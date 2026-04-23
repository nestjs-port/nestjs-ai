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

import { OpenAiChatModel, OpenAiChatOptions } from "@nestjs-ai/model-openai";
import { beforeAll, describe, it } from "vitest";
import { AbstractToolCallAdvisorIT } from "./abstract-tool-call-advisor.it-shared";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiToolCallAdvisorIT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  let abstractIT: AbstractToolCallAdvisorIT;

  beforeAll(() => {
    abstractIT = new AbstractToolCallAdvisorIT(
      new OpenAiChatModel({
        options: OpenAiChatOptions.builder()
          .apiKey(OPENAI_API_KEY ?? "")
          .model(OpenAiChatOptions.DEFAULT_CHAT_MODEL)
          .build(),
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

    it("stream with return direct", async () => {
      await abstractIT.testStreamWithReturnDirect();
    });
  });
});
