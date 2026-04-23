/*
 * Copyright 2026-present the original author or authors.
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

import "reflect-metadata";
import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  type ChatClient,
  ChatClientModule as ChatClientModuleClass,
} from "@nestjs-ai/client-chat";
import {
  CHAT_CLIENT_BUILDER_TOKEN,
  CHAT_MODEL_TOKEN,
} from "@nestjs-ai/commons";
import type { ChatModel } from "@nestjs-ai/model";
import { assert, describe, expect, it } from "vitest";

const CHAT_MODEL = {} as ChatModel;
const API_KEY_TOKEN = Symbol("API_KEY_TOKEN");

@Module({
  providers: [
    {
      provide: CHAT_MODEL_TOKEN,
      useValue: CHAT_MODEL,
    },
  ],
  exports: [CHAT_MODEL_TOKEN],
})
class ChatModelModule {}

@Module({
  providers: [
    {
      provide: API_KEY_TOKEN,
      useValue: "test-api-key",
    },
  ],
  exports: [API_KEY_TOKEN],
})
class ApiKeyConfigModule {}

describe("ChatClientModule", () => {
  describe("forFeature", () => {
    it("resolves the chat client builder via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ChatClientModuleClass.forFeature({
            imports: [ChatModelModule],
          }),
        ],
      }).compile();

      const builder = await moduleRef.resolve(CHAT_CLIENT_BUILDER_TOKEN);
      assert.exists(builder);
    });

    it("creates a transient builder provider", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ChatClientModuleClass.forFeature({
            imports: [ChatModelModule],
          }),
        ],
      }).compile();

      const first = await moduleRef.resolve(CHAT_CLIENT_BUILDER_TOKEN);
      const second = await moduleRef.resolve(CHAT_CLIENT_BUILDER_TOKEN);

      expect(first).not.toBe(second);
    });

    it("applies a direct customizer when provided", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ChatClientModuleClass.forFeature({
            customizer: (builder: ChatClient.Builder) => {
              (builder as { customized?: boolean }).customized = true;
            },
            imports: [ChatModelModule],
          }),
        ],
      }).compile();

      const builder = await moduleRef.resolve(CHAT_CLIENT_BUILDER_TOKEN);
      expect((builder as { customized?: boolean }).customized).toBe(true);
    });

    it("supports global option", async () => {
      const featureModule = ChatClientModuleClass.forFeature({
        imports: [ChatModelModule],
        global: true,
      });

      expect(featureModule.global).toBe(true);
    });
  });

  describe("forFeatureAsync", () => {
    it("supports imports and inject for async customizer factory", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ChatClientModuleClass.forFeatureAsync({
            imports: [ChatModelModule, ApiKeyConfigModule],
            inject: [API_KEY_TOKEN],
            useFactory: (apiKey: string) => (builder: ChatClient.Builder) => {
              (builder as { apiKey?: string }).apiKey = apiKey;
            },
          }),
        ],
      }).compile();

      const builder = await moduleRef.resolve(CHAT_CLIENT_BUILDER_TOKEN);
      expect((builder as { apiKey?: string }).apiKey).toBe("test-api-key");
    });

    it("supports async customizer factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ChatClientModuleClass.forFeatureAsync({
            imports: [ChatModelModule],
            useFactory: async () => (builder: ChatClient.Builder) => {
              (builder as { asyncCustomized?: boolean }).asyncCustomized = true;
            },
          }),
        ],
      }).compile();

      const builder = await moduleRef.resolve(CHAT_CLIENT_BUILDER_TOKEN);
      expect((builder as { asyncCustomized?: boolean }).asyncCustomized).toBe(
        true,
      );
    });

    it("uses the default false global option", () => {
      const featureModule = ChatClientModuleClass.forFeature({});

      expect(featureModule.global).toBe(false);
    });
  });
});
