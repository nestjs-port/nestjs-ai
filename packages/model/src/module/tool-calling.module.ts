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
  ObservationFilters,
  TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN,
  type ToolCallingObservationProperties,
} from "@nestjs-ai/commons";
import {
  DefaultToolExecutionExceptionProcessor,
  ToolCallingContentObservationFilter,
} from "../tool";

export const TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN = Symbol.for(
  "TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN",
);

const defaultToolExecutionExceptionProcessorProvider: Provider = {
  provide: DefaultToolExecutionExceptionProcessor,
  useFactory: () => new DefaultToolExecutionExceptionProcessor(false),
};

const toolExecutionExceptionProcessorAliasProvider: Provider = {
  provide: TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN,
  useExisting: DefaultToolExecutionExceptionProcessor,
};

const toolCallingContentObservationFilterProvider: Provider = {
  provide: ToolCallingContentObservationFilter,
  useFactory: (
    observationProperties: ToolCallingObservationProperties | null,
    observationFilters: ObservationFilters | null,
  ) => {
    const filter = new ToolCallingContentObservationFilter();
    if (observationProperties?.includeContent && observationFilters != null) {
      observationFilters.addFilter(filter);
    }
    return filter;
  },
  inject: [
    { token: TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN, optional: true },
    { token: ObservationFilters, optional: true },
  ],
};

/**
 * Tool calling auto-configuration entry point for default tool-related providers.
 */
@Module({
  providers: [
    defaultToolExecutionExceptionProcessorProvider,
    toolCallingContentObservationFilterProvider,
    toolExecutionExceptionProcessorAliasProvider,
  ],
  exports: [
    TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN,
    ToolCallingContentObservationFilter,
  ],
})
export class ToolCallingModule {}
