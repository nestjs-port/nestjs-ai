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

import { type ChatResponse, DefaultUsage, type Usage } from "../chat";

/**
 * A utility class to provide support methods handling {@link Usage}.
 */
export abstract class UsageCalculator {
  /**
   * Accumulate usage tokens from the previous chat response to the current usage
   * tokens.
   * @param currentUsage the current usage.
   * @param previousChatResponse the previous chat response.
   * @returns accumulated usage.
   */
  static getCumulativeUsage(
    currentUsage: Usage,
    previousChatResponse: ChatResponse | null,
  ): Usage {
    let usageFromPreviousChatResponse: Usage | null = null;
    if (previousChatResponse?.metadata?.usage) {
      usageFromPreviousChatResponse = previousChatResponse.metadata.usage;
    } else {
      // Return the current usage when the previous chat response usage is empty or
      // null.
      return currentUsage;
    }
    // For a valid usage from previous chat response, accumulate it to the current
    // usage.
    if (!UsageCalculator.isEmpty(currentUsage)) {
      let promptTokens = currentUsage.promptTokens;
      let generationTokens = currentUsage.completionTokens;
      let totalTokens = currentUsage.totalTokens;
      // Make sure to accumulate the usage from the previous chat response.
      promptTokens += usageFromPreviousChatResponse.promptTokens;
      generationTokens += usageFromPreviousChatResponse.completionTokens;
      totalTokens += usageFromPreviousChatResponse.totalTokens;
      return new DefaultUsage({
        promptTokens,
        completionTokens: generationTokens,
        totalTokens,
      });
    }
    // When current usage is empty, return the usage from the previous chat response.
    return usageFromPreviousChatResponse;
  }

  /**
   * Check if the {@link Usage} is empty. Returns true when the {@link Usage} is null.
   * Returns true when the {@link Usage} has zero tokens.
   * @param usage the usage to check against.
   * @returns the boolean value to represent if it is empty.
   */
  static isEmpty(usage?: Usage | null): boolean {
    return usage == null || usage.totalTokens === 0;
  }
}
