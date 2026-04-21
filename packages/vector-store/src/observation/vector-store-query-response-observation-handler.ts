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

import { ObservabilityHelper } from "@nestjs-ai/commons";
import type { ObservationContext, ObservationHandler } from "@nestjs-port/core";
import { LoggerFactory, StringUtils } from "@nestjs-port/core";
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
