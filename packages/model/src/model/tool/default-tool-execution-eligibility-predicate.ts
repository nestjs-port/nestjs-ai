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

import type { ChatOptions, ChatResponse } from "../../chat";
import { ToolCallingChatOptions } from "./tool-calling-chat-options.interface";
import { ToolExecutionEligibilityPredicate } from "./tool-execution-eligibility-predicate";

/**
 * Default implementation of {@link ToolExecutionEligibilityPredicate} that checks whether
 * tool execution is enabled in the prompt options and if the chat response contains tool
 * calls.
 */
export class DefaultToolExecutionEligibilityPredicate extends ToolExecutionEligibilityPredicate {
  test(promptOptions: ChatOptions, chatResponse: ChatResponse): boolean {
    return (
      ToolCallingChatOptions.isInternalToolExecutionEnabled(promptOptions) &&
      chatResponse != null &&
      chatResponse.hasToolCalls()
    );
  }

  override isToolExecutionRequired(
    promptOptions: ChatOptions,
    chatResponse: ChatResponse,
  ): boolean {
    return this.test(promptOptions, chatResponse);
  }
}
