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
import { Global, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PROVIDER_INSTANCE_EXPLORER_TOKEN } from "@nestjs-ai/commons";
import {
  DelegatingToolCallbackResolver,
  TOOL_CALLBACK_RESOLVER_TOKEN,
  TOOL_CALLING_MANAGER_TOKEN,
  TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN,
  ToolCallingModule,
} from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";

@Global()
@Module({
  providers: [
    {
      provide: PROVIDER_INSTANCE_EXPLORER_TOKEN,
      useValue: {
        getProviderInstances: () => [],
      },
    },
  ],
  exports: [PROVIDER_INSTANCE_EXPLORER_TOKEN],
})
class ProviderExplorerModule {}

describe("ToolCallingModule", () => {
  it("resolves the default tool callback resolver and manager via NestJS DI", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ToolCallingModule],
    }).compile();

    expect(moduleRef.get(TOOL_CALLBACK_RESOLVER_TOKEN)).toBeDefined();
    expect(
      moduleRef.get(TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN),
    ).toBeDefined();
    expect(moduleRef.get(TOOL_CALLING_MANAGER_TOKEN)).toBeDefined();
  });

  it("uses a delegating resolver when a provider instance explorer is available", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProviderExplorerModule, ToolCallingModule],
    }).compile();

    expect(moduleRef.get(TOOL_CALLBACK_RESOLVER_TOKEN)).toBeInstanceOf(
      DelegatingToolCallbackResolver,
    );
  });
});
