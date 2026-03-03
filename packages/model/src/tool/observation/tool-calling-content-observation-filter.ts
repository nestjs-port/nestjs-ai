import type { ObservationContext, ObservationFilter } from "@nestjs-ai/commons";
import { KeyValue } from "@nestjs-ai/commons";
import { ToolCallingObservationContext } from "./tool-calling-observation-context";

const TOOL_CALL_ARGUMENTS = "spring.ai.tool.call.arguments";
const TOOL_CALL_RESULT = "spring.ai.tool.call.result";

export class ToolCallingContentObservationFilter implements ObservationFilter {
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
