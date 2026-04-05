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
import { ObservationFilters } from "@nestjs-ai/commons";
import {
  TOOL_CALLBACK_RESOLVER_TOKEN,
  TOOL_CALLING_CONTENT_OBSERVATION_FILTER_OVERRIDE_TOKEN,
  TOOL_CALLING_CONTENT_OBSERVATION_FILTER_TOKEN,
  TOOL_CALLING_MANAGER_TOKEN,
  TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN,
  ToolCallingContentObservationFilter,
  ToolCallingModule,
} from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { ObservationModule } from "../../../observation/src";

const overrideFilter = {
  marker: "override-filter",
} as unknown as ToolCallingContentObservationFilter;

@Global()
@Module({
  providers: [
    {
      provide: TOOL_CALLING_CONTENT_OBSERVATION_FILTER_OVERRIDE_TOKEN,
      useValue: overrideFilter,
    },
  ],
  exports: [TOOL_CALLING_CONTENT_OBSERVATION_FILTER_OVERRIDE_TOKEN],
})
class ToolCallingContentObservationFilterOverrideModule {}

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

  it("prefers the override token provider when present", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ToolCallingContentObservationFilterOverrideModule,
        ToolCallingModule,
      ],
    }).compile();

    expect(moduleRef.get(TOOL_CALLING_CONTENT_OBSERVATION_FILTER_TOKEN)).toBe(
      overrideFilter,
    );
  });

  it("adds the content observation filter only when content collection is enabled", async () => {
    const enabledModuleRef = await Test.createTestingModule({
      imports: [
        ObservationModule.forRoot({
          toolCalling: { includeContent: true },
        }),
        ToolCallingModule,
      ],
    }).compile();

    const enabledFilter = enabledModuleRef.get(
      TOOL_CALLING_CONTENT_OBSERVATION_FILTER_TOKEN,
    );

    expect(enabledFilter).toBeInstanceOf(ToolCallingContentObservationFilter);
    expect(enabledModuleRef.get(ObservationFilters).filters).toHaveLength(1);
    expect(enabledModuleRef.get(ObservationFilters).filters[0]).toBe(
      enabledFilter,
    );

    const disabledModuleRef = await Test.createTestingModule({
      imports: [
        ObservationModule.forRoot({
          toolCalling: { includeContent: false },
        }),
        ToolCallingModule,
      ],
    }).compile();

    const disabledFilter = disabledModuleRef.get(
      TOOL_CALLING_CONTENT_OBSERVATION_FILTER_TOKEN,
    );

    expect(disabledFilter).toBeInstanceOf(ToolCallingContentObservationFilter);
    expect(disabledModuleRef.get(ObservationFilters).filters).toHaveLength(0);
  });
});
