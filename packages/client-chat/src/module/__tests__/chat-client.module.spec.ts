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

import type { FactoryProvider } from "@nestjs/common";
import { Scope } from "@nestjs/common";
import {
  CHAT_CLIENT_BUILDER_TOKEN,
  CHAT_CLIENT_CUSTOMIZER_TOKEN,
  CHAT_MODEL_TOKEN,
} from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { ChatClientModule } from "../chat-client.module";
import { ChatClientBuilderConfigurer } from "../chat-client-builder-configurer";

describe("ChatClientModule", () => {
  it("registers configurer and builder providers via forFeature", () => {
    const dynamicModule = ChatClientModule.forFeature();
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(
      providers.some((p) => p.provide === ChatClientBuilderConfigurer),
    ).toBe(true);
    expect(providers.some((p) => p.provide === CHAT_CLIENT_BUILDER_TOKEN)).toBe(
      true,
    );
  });

  it("exports CHAT_CLIENT_BUILDER_TOKEN", () => {
    const dynamicModule = ChatClientModule.forFeature();
    expect(dynamicModule.exports).toContain(CHAT_CLIENT_BUILDER_TOKEN);
  });

  it("registers builder with TRANSIENT scope", () => {
    const dynamicModule = ChatClientModule.forFeature();
    const providers = dynamicModule.providers as FactoryProvider[];

    const builderProvider = providers.find(
      (p) => p.provide === CHAT_CLIENT_BUILDER_TOKEN,
    ) as FactoryProvider;

    expect(builderProvider.scope).toBe(Scope.TRANSIENT);
  });

  it("injects CHAT_MODEL_TOKEN into builder provider", () => {
    const dynamicModule = ChatClientModule.forFeature();
    const providers = dynamicModule.providers as FactoryProvider[];

    const builderProvider = providers.find(
      (p) => p.provide === CHAT_CLIENT_BUILDER_TOKEN,
    ) as FactoryProvider;

    expect(builderProvider.inject).toContain(CHAT_MODEL_TOKEN);
  });

  it("registers customizer provider placeholder when none provided", () => {
    const dynamicModule = ChatClientModule.forFeature();
    const providers = dynamicModule.providers as FactoryProvider[];

    expect(
      providers.some((p) => p.provide === CHAT_CLIENT_CUSTOMIZER_TOKEN),
    ).toBe(true);
  });

  it("registers customizer function via forFeature", async () => {
    const customizer = () => {};
    const dynamicModule = ChatClientModule.forFeature(customizer);
    const providers = dynamicModule.providers as FactoryProvider[];

    const customizerProvider = providers.find(
      (p) => p.provide === CHAT_CLIENT_CUSTOMIZER_TOKEN,
    ) as FactoryProvider;

    expect(customizerProvider).toBeDefined();
    await expect(customizerProvider.useFactory()).resolves.toBe(customizer);
  });

  it("registers customizer factory definition via forFeature", async () => {
    const customizerFn = () => {};
    const dynamicModule = ChatClientModule.forFeature({
      useFactory: () => customizerFn,
      inject: [],
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    const customizerProvider = providers.find(
      (p) => p.provide === CHAT_CLIENT_CUSTOMIZER_TOKEN,
    ) as FactoryProvider;

    expect(customizerProvider).toBeDefined();
    await expect(customizerProvider.useFactory()).resolves.toBe(customizerFn);
  });

  it("registers async customizer provider via forFeatureAsync", () => {
    const dynamicModule = ChatClientModule.forFeatureAsync({
      useFactory: () => () => {},
    });
    const providers = dynamicModule.providers as FactoryProvider[];

    const customizerProvider = providers.find(
      (p) => p.provide === CHAT_CLIENT_CUSTOMIZER_TOKEN,
    ) as FactoryProvider;

    expect(customizerProvider).toBeDefined();
    expect(customizerProvider.useFactory).toBeDefined();
  });

  it("passes imports through to dynamic module", () => {
    const fakeModule = class FakeModule {};
    const dynamicModule = ChatClientModule.forFeature(undefined, {
      imports: [fakeModule],
    });

    expect(dynamicModule.imports).toContain(fakeModule);
  });
});
