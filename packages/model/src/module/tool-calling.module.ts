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
import {
  createConditionalProvider,
  OBSERVATION_REGISTRY_TOKEN,
  ObservationFilters,
  type ObservationRegistry,
  PROVIDER_INSTANCE_EXPLORER_TOKEN,
  type ProviderInstanceExplorer,
  TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN,
  type ToolCallingObservationProperties,
} from "@nestjs-ai/commons";
import { DefaultToolCallingManager, type ToolCallingManager } from "../model";
import {
  DefaultToolExecutionExceptionProcessor,
  DelegatingToolCallbackResolver,
  NestProviderToolCallbackResolver,
  type ToolCallbackResolver,
  ToolCallingContentObservationFilter,
  ToolCallingObservationConvention,
} from "../tool";

const toolCallbackResolverCondition = createConditionalProvider({
  token: "TOOL_CALLBACK_RESOLVER_TOKEN",
  inject: [{ token: PROVIDER_INSTANCE_EXPLORER_TOKEN, optional: true }],
  resolve: (
    toolCallbackResolver?: ToolCallbackResolver | null,
    providerInstanceExplorer?: ProviderInstanceExplorer | null,
  ) =>
    toolCallbackResolver ??
    (providerInstanceExplorer != null
      ? new NestProviderToolCallbackResolver(providerInstanceExplorer)
      : new DelegatingToolCallbackResolver([])),
});

export const TOOL_CALLBACK_RESOLVER_TOKEN = toolCallbackResolverCondition.token;
export const TOOL_CALLBACK_RESOLVER_OVERRIDE_TOKEN =
  toolCallbackResolverCondition.overrideToken;

const toolExecutionExceptionProcessorCondition = createConditionalProvider({
  token: "TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN",
  inject: [],
  resolve: (
    toolExecutionExceptionProcessor?: DefaultToolExecutionExceptionProcessor | null,
  ) =>
    toolExecutionExceptionProcessor ??
    new DefaultToolExecutionExceptionProcessor(false),
});

export const TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN =
  toolExecutionExceptionProcessorCondition.token;
export const TOOL_EXECUTION_EXCEPTION_PROCESSOR_OVERRIDE_TOKEN =
  toolExecutionExceptionProcessorCondition.overrideToken;

const toolCallingManagerCondition = createConditionalProvider({
  token: "TOOL_CALLING_MANAGER_TOKEN",
  inject: [
    { token: TOOL_CALLBACK_RESOLVER_TOKEN, optional: true },
    { token: TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN, optional: true },
    { token: OBSERVATION_REGISTRY_TOKEN, optional: true },
    { token: ToolCallingObservationConvention, optional: true },
  ],
  resolve: (
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
        toolCallbackResolver ?? new DelegatingToolCallbackResolver([]),
      toolExecutionExceptionProcessor:
        toolExecutionExceptionProcessor ?? undefined,
    }),
});

export const TOOL_CALLING_MANAGER_TOKEN = toolCallingManagerCondition.token;
export const TOOL_CALLING_MANAGER_OVERRIDE_TOKEN =
  toolCallingManagerCondition.overrideToken;

const toolCallingContentObservationFilterCondition = createConditionalProvider({
  token: "TOOL_CALLING_CONTENT_OBSERVATION_FILTER_TOKEN",
  inject: [
    { token: TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN, optional: true },
    { token: ObservationFilters, optional: true },
  ],
  resolve: (
    toolCallingContentObservationFilter: ToolCallingContentObservationFilter | null,
    observationProperties: ToolCallingObservationProperties | null,
    observationFilters: ObservationFilters | null,
  ) => {
    if (toolCallingContentObservationFilter != null) {
      return toolCallingContentObservationFilter;
    }

    const filter = new ToolCallingContentObservationFilter();
    if (observationProperties?.includeContent && observationFilters != null) {
      observationFilters.addFilter(filter);
    }
    return filter;
  },
});

export const TOOL_CALLING_CONTENT_OBSERVATION_FILTER_TOKEN =
  toolCallingContentObservationFilterCondition.token;
export const TOOL_CALLING_CONTENT_OBSERVATION_FILTER_OVERRIDE_TOKEN =
  toolCallingContentObservationFilterCondition.overrideToken;

/**
 * Tool calling auto-configuration entry point for default tool-related providers.
 */
@Module({
  providers: [
    toolCallbackResolverCondition.provider,
    toolExecutionExceptionProcessorCondition.provider,
    toolCallingManagerCondition.provider,
    toolCallingContentObservationFilterCondition.provider,
  ],
  exports: [
    TOOL_CALLBACK_RESOLVER_TOKEN,
    TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN,
    TOOL_CALLING_MANAGER_TOKEN,
    TOOL_CALLING_CONTENT_OBSERVATION_FILTER_TOKEN,
  ],
})
export class ToolCallingModule {}
