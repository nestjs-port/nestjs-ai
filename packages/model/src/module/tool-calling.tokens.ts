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

// Tool callback inputs.
export const TOOL_CALLBACKS_TOKEN = Symbol.for("TOOL_CALLBACKS_TOKEN");
export const TOOL_CALLBACK_PROVIDER_TOKEN = Symbol.for(
  "TOOL_CALLBACK_PROVIDER_TOKEN",
);

// Tool callback resolution.
export const TOOL_CALLBACK_RESOLVER_TOKEN = Symbol.for(
  "TOOL_CALLBACK_RESOLVER_TOKEN",
);
export const TOOL_CALLBACK_RESOLVER_OVERRIDE_TOKEN = Symbol.for(
  "TOOL_CALLBACK_RESOLVER_TOKEN_OVERRIDE_TOKEN",
);

// Tool execution.
export const TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN = Symbol.for(
  "TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN",
);
export const TOOL_EXECUTION_EXCEPTION_PROCESSOR_OVERRIDE_TOKEN = Symbol.for(
  "TOOL_EXECUTION_EXCEPTION_PROCESSOR_TOKEN_OVERRIDE_TOKEN",
);

// Tool calling manager.
export const TOOL_CALLING_MANAGER_TOKEN = Symbol.for(
  "TOOL_CALLING_MANAGER_TOKEN",
);
export const TOOL_CALLING_MANAGER_OVERRIDE_TOKEN = Symbol.for(
  "TOOL_CALLING_MANAGER_TOKEN_OVERRIDE_TOKEN",
);

// Tool call observation.
export const TOOL_CALLING_CONTENT_OBSERVATION_FILTER_TOKEN = Symbol.for(
  "TOOL_CALLING_CONTENT_OBSERVATION_FILTER_TOKEN",
);
export const TOOL_CALLING_CONTENT_OBSERVATION_FILTER_OVERRIDE_TOKEN =
  Symbol.for("TOOL_CALLING_CONTENT_OBSERVATION_FILTER_TOKEN_OVERRIDE_TOKEN");
