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
  HTTP_CLIENT_TOKEN,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
} from "@nestjs-ai/commons";
import { NestAiModule } from "@nestjs-ai/platform";
import type { HttpClient } from "@nestjs-port/core";
import { assert, describe, expect, it } from "vitest";

const TEST_HTTP_CLIENT: HttpClient = {
  fetch: async () => new Response(null, { status: 200 }),
};

const CONFIG_TOKEN = Symbol("CONFIG_TOKEN");

@Module({
  providers: [
    {
      provide: CONFIG_TOKEN,
      useValue: { httpClient: TEST_HTTP_CLIENT },
    },
  ],
  exports: [CONFIG_TOKEN],
})
class ConfigModule {}

describe("NestAiModule", () => {
  describe("forRoot", () => {
    it("should register default providers and resolve them via DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot()],
      }).compile();

      assert.exists(moduleRef.get(HTTP_CLIENT_TOKEN));
      assert.exists(moduleRef.get(PROVIDER_INSTANCE_EXPLORER_TOKEN));
    });

    it("should use explicit HTTP client when provided", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [NestAiModule.forRoot({ httpClient: TEST_HTTP_CLIENT })],
      }).compile();

      expect(moduleRef.get(HTTP_CLIENT_TOKEN)).toBe(TEST_HTTP_CLIENT);
    });

    it("should be global by default", async () => {
      const rootModule = NestAiModule.forRoot();

      const moduleRef = await Test.createTestingModule({
        imports: [rootModule],
      }).compile();

      assert.exists(moduleRef.get(HTTP_CLIENT_TOKEN));
      expect(rootModule.global).toBe(true);
    });

    it("should respect global: false option", async () => {
      const rootModule = NestAiModule.forRoot({ global: false });

      const moduleRef = await Test.createTestingModule({
        imports: [rootModule],
      }).compile();

      assert.exists(moduleRef.get(HTTP_CLIENT_TOKEN));
      expect(rootModule.global).toBe(false);
    });
  });

  describe("forRootAsync", () => {
    it("should resolve providers from async factory with imports and inject", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRootAsync({
            imports: [ConfigModule],
            inject: [CONFIG_TOKEN],
            useFactory: (config: { httpClient: HttpClient }) => ({
              httpClient: config.httpClient,
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(HTTP_CLIENT_TOKEN)).toBe(TEST_HTTP_CLIENT);
    });

    it("should support async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          NestAiModule.forRootAsync({
            useFactory: async () => ({
              httpClient: TEST_HTTP_CLIENT,
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(HTTP_CLIENT_TOKEN)).toBe(TEST_HTTP_CLIENT);
    });

    it("should be global by default for async", async () => {
      const rootModule = NestAiModule.forRootAsync({
        useFactory: () => ({}),
      });

      const moduleRef = await Test.createTestingModule({
        imports: [rootModule],
      }).compile();

      assert.exists(moduleRef.get(HTTP_CLIENT_TOKEN));
      expect(rootModule.global).toBe(true);
    });

    it("should respect global: false for async", async () => {
      const rootModule = NestAiModule.forRootAsync({
        useFactory: () => ({}),
        global: false,
      });

      const moduleRef = await Test.createTestingModule({
        imports: [rootModule],
      }).compile();

      assert.exists(moduleRef.get(HTTP_CLIENT_TOKEN));
      expect(rootModule.global).toBe(false);
    });
  });
});
