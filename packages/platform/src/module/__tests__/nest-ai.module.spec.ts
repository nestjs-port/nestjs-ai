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

import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { HttpClient } from "@nestjs-ai/commons";
import { HTTP_CLIENT_TOKEN, ObservationHandlers } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { NestAiModule } from "../nest-ai.module";

const TEST_HTTP_CLIENT: HttpClient = {
  fetch: async () => new Response(null, { status: 200 }),
};

const CONFIG_TOKEN = Symbol("CONFIG_TOKEN");

@Module({
  providers: [
    {
      provide: CONFIG_TOKEN,
      useValue: {
        httpClient: TEST_HTTP_CLIENT,
      },
    },
  ],
  exports: [CONFIG_TOKEN],
})
class ConfigModule {}

describe("NestAIModule", () => {
  it("registers default HTTP client provider in forRoot", () => {
    const dynamicModule = NestAiModule.forRoot();
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    expect(dynamicModule.module).toBe(NestAiModule);
    expect(dynamicModule.global).toBe(true);

    const httpClientProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === HTTP_CLIENT_TOKEN,
    );

    expect(httpClientProvider).toBeDefined();
    expect(
      typeof httpClientProvider === "object" &&
        httpClientProvider !== null &&
        "useValue" in httpClientProvider,
    ).toBe(true);
    expect(exportsList).toContain(HTTP_CLIENT_TOKEN);
  });

  it("uses explicit HTTP client when provided in forRoot", () => {
    const dynamicModule = NestAiModule.forRoot({
      httpClient: TEST_HTTP_CLIENT,
    });
    const providers = dynamicModule.providers ?? [];

    const httpClientProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === HTTP_CLIENT_TOKEN,
    );

    expect(httpClientProvider).toBeDefined();
    expect(
      typeof httpClientProvider === "object" &&
        httpClientProvider !== null &&
        "useValue" in httpClientProvider
        ? httpClientProvider.useValue
        : undefined,
    ).toBe(TEST_HTTP_CLIENT);
  });

  it("registers observation handlers provider and export", () => {
    const dynamicModule = NestAiModule.forRoot();
    const providers = dynamicModule.providers ?? [];
    const exportsList = dynamicModule.exports ?? [];

    const observationHandlersProvider = providers.find(
      (provider) =>
        typeof provider === "object" &&
        provider !== null &&
        "provide" in provider &&
        provider.provide === ObservationHandlers,
    );

    expect(observationHandlersProvider).toBeDefined();
    expect(exportsList).toContain(ObservationHandlers);
  });

  it("supports async root configuration with imports and inject", async () => {
    const testingModule = await Test.createTestingModule({
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

    expect(testingModule.get(HTTP_CLIENT_TOKEN)).toBe(TEST_HTTP_CLIENT);
  });

  it("uses async module global option when provided", () => {
    const dynamicModule = NestAiModule.forRootAsync({
      useFactory: () => ({
        httpClient: TEST_HTTP_CLIENT,
      }),
      global: false,
    });

    expect(dynamicModule.global).toBe(false);
  });

  it("uses module global option when provided", () => {
    const dynamicModule = NestAiModule.forRoot({ global: false });
    expect(dynamicModule.global).toBe(false);
  });
});
