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

import assert from "node:assert/strict";
import type { Message } from "../../chat/index.js";
import { ToolExecutionResult } from "./tool-execution-result.js";

export interface DefaultToolExecutionResultProps {
  conversationHistory: Message[];
  returnDirect?: boolean;
}

/**
 * Default implementation of {@link ToolExecutionResult}.
 */
export class DefaultToolExecutionResult extends ToolExecutionResult {
  private readonly _conversationHistory: Message[];
  private readonly _returnDirect: boolean;

  constructor(props: DefaultToolExecutionResultProps) {
    super();
    assert(props.conversationHistory, "conversationHistory cannot be null");
    assert(
      props.conversationHistory.every((msg) => msg != null),
      "conversationHistory cannot contain null elements",
    );
    this._conversationHistory = props.conversationHistory;
    this._returnDirect = props.returnDirect ?? false;
  }

  conversationHistory(): Message[] {
    return this._conversationHistory;
  }

  returnDirect(): boolean {
    return this._returnDirect;
  }
}
