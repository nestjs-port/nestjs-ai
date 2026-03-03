import type {
  KeyValues,
  ObservationContext,
  ObservationConvention,
} from "@nestjs-ai/commons";

import { ToolCallingObservationContext } from "./tool-calling-observation-context";

export abstract class ToolCallingObservationConvention
  implements ObservationConvention<ToolCallingObservationContext>
{
  abstract getName(): string;

  abstract getContextualName(context: ToolCallingObservationContext): string;

  supportsContext(
    context: ObservationContext,
  ): context is ToolCallingObservationContext {
    return context instanceof ToolCallingObservationContext;
  }

  abstract getLowCardinalityKeyValues(
    context: ToolCallingObservationContext,
  ): KeyValues;

  abstract getHighCardinalityKeyValues(
    context: ToolCallingObservationContext,
  ): KeyValues;
}
