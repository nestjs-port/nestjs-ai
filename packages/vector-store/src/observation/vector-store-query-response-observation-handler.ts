import {
  LoggerFactory,
  ObservabilityHelper,
  type ObservationContext,
  type ObservationHandler,
  StringUtils,
} from "@nestjs-ai/commons";
import { VectorStoreObservationContext } from "./vector-store-observation-context";

export class VectorStoreQueryResponseObservationHandler
  implements ObservationHandler<VectorStoreObservationContext>
{
  private readonly logger = LoggerFactory.getLogger(
    VectorStoreQueryResponseObservationHandler.name,
  );

  onStop(context: VectorStoreObservationContext): void {
    this.logger.info(
      `Vector Store Query Response:\n${ObservabilityHelper.concatenateStrings(this.documents(context))}`,
    );
  }

  private documents(context: VectorStoreObservationContext): string[] {
    const queryResponse = context.queryResponse;
    if (queryResponse == null || queryResponse.length === 0) {
      return [];
    }

    return queryResponse
      .map((document) => document.text)
      .filter((text): text is string => StringUtils.hasText(text));
  }

  supportsContext(
    context: ObservationContext,
  ): context is VectorStoreObservationContext {
    return context instanceof VectorStoreObservationContext;
  }
}
