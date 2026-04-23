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

import type { Ordered } from "@nestjs-port/core";
import {
  KeyValue,
  type ObservationContext,
  type ObservationFilter,
} from "@nestjs-port/core";
import { ToolCallingObservationContext } from "./tool-calling-observation-context.js";

const TOOL_CALL_ARGUMENTS = "spring.ai.tool.call.arguments";
const TOOL_CALL_RESULT = "spring.ai.tool.call.result";

export class ToolCallingContentObservationFilter
  implements ObservationFilter, Ordered
{
  get order(): number {
    return 0;
  }

  map(context: ObservationContext): ObservationContext {
    if (!(context instanceof ToolCallingObservationContext)) {
      return context;
    }

    context.addHighCardinalityKeyValue(
      KeyValue.of(TOOL_CALL_ARGUMENTS, context.toolCallArguments),
    );

    if (context.toolCallResult != null) {
      context.addHighCardinalityKeyValue(
        KeyValue.of(TOOL_CALL_RESULT, context.toolCallResult),
      );
    }

    return context;
  }
}
