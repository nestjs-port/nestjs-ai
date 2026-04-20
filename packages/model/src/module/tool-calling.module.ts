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

import type { Provider } from "@nestjs/common";
import { Module } from "@nestjs/common";
import {
  OBSERVATION_REGISTRY_TOKEN,
  type ObservationFilters,
  type ObservationRegistry,
} from "@nestjs-ai/commons";
import { DefaultToolCallingManager, type ToolCallingManager } from "../model";
import {
  DefaultToolExecutionExceptionProcessor,
  StaticToolCallbackResolver,
  type ToolCallback,
  type ToolCallbackProvider,
  type ToolCallbackResolver,
  ToolCallingContentObservationFilter,
  ToolCallingObservationConvention,
} from "../tool";
import {
  TOOL_CALLBACK_PROVIDER_TOKEN,
  TOOL_CALLBACK_RESOLVER_OVERRIDE_TOKEN,
  TOOL_CALLBACK_RESOLVER_TOKEN,
  TOOL_CALLBACKS_TOKEN,
  TOOL_CALLING_MANAGER_OVERRIDE_TOKEN,
  TOOL_CALLING_MANAGER_TOKEN,
  TOOL_EXECUTION_EXCEPTION_PROCESSOR_OVERRIDE_TOKEN,
  TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN,
} from "./tool-calling.tokens";
import type { ToolCallingObservationProperties } from "./tool-calling-observation-properties";

const toolCallbackResolverProvider: Provider = {
  provide: TOOL_CALLBACK_RESOLVER_TOKEN,
  useFactory: (
    toolCallbackResolver?: ToolCallbackResolver | null,
    toolCallbacks?: ToolCallback[] | null,
    toolCallbackProvider?: ToolCallbackProvider | null,
  ) =>
    toolCallbackResolver ??
    new StaticToolCallbackResolver([
      ...(toolCallbacks ?? []),
      ...(toolCallbackProvider?.toolCallbacks ?? []),
    ]),
  inject: [
    { token: TOOL_CALLBACK_RESOLVER_OVERRIDE_TOKEN, optional: true },
    { token: TOOL_CALLBACKS_TOKEN, optional: true },
    { token: TOOL_CALLBACK_PROVIDER_TOKEN, optional: true },
  ],
};

const toolExecutionExceptionProcessorProvider: Provider = {
  provide: TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN,
  useFactory: (
    toolExecutionExceptionProcessor?: DefaultToolExecutionExceptionProcessor | null,
  ) =>
    toolExecutionExceptionProcessor ??
    new DefaultToolExecutionExceptionProcessor(false),
  inject: [
    {
      token: TOOL_EXECUTION_EXCEPTION_PROCESSOR_OVERRIDE_TOKEN,
      optional: true,
    },
  ],
};

const toolCallingManagerProvider: Provider = {
  provide: TOOL_CALLING_MANAGER_TOKEN,
  useFactory: (
    toolCallingManager?: ToolCallingManager | null,
    toolCallbackResolver?: ToolCallbackResolver | null,
    toolExecutionExceptionProcessor?: DefaultToolExecutionExceptionProcessor | null,
    observationRegistry?: ObservationRegistry | null,
    observationConvention?: ToolCallingObservationConvention | null,
  ) =>
    toolCallingManager ??
    new DefaultToolCallingManager({
      observationRegistry: observationRegistry ?? undefined,
      observationConvention: observationConvention ?? undefined,
      toolCallbackResolver:
        toolCallbackResolver ?? new StaticToolCallbackResolver([]),
      toolExecutionExceptionProcessor:
        toolExecutionExceptionProcessor ?? undefined,
    }),
  inject: [
    { token: TOOL_CALLING_MANAGER_OVERRIDE_TOKEN, optional: true },
    { token: TOOL_CALLBACK_RESOLVER_TOKEN, optional: true },
    { token: TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN, optional: true },
    { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
    { token: ToolCallingObservationConvention, optional: true },
  ],
};

/**
 * Module that registers tool calling providers.
 */
@Module({
  providers: [
    toolCallbackResolverProvider,
    toolExecutionExceptionProcessorProvider,
    toolCallingManagerProvider,
  ],
  exports: [
    TOOL_CALLBACK_RESOLVER_TOKEN,
    TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN,
    TOOL_CALLING_MANAGER_TOKEN,
  ],
})
export class ToolCallingModule {}

export function addToolCallingContentObservationFilter(
  observationFilters: ObservationFilters | null | undefined,
  toolCalling: ToolCallingObservationProperties | null | undefined,
): ToolCallingContentObservationFilter | undefined {
  if (!toolCalling?.includeContent || observationFilters == null) {
    return undefined;
  }

  const existingFilter = observationFilters.filters.find(
    (filter) => filter instanceof ToolCallingContentObservationFilter,
  );
  if (existingFilter instanceof ToolCallingContentObservationFilter) {
    return existingFilter;
  }

  const filter = new ToolCallingContentObservationFilter();
  observationFilters.addFilter(filter);
  return filter;
}
