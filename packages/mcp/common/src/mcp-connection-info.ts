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
import type {
  ClientCapabilities,
  Implementation,
  InitializeResult,
} from "@modelcontextprotocol/sdk/spec.types.js";

export interface McpConnectionInfoProps {
  clientCapabilities: ClientCapabilities;
  clientInfo: Implementation;
  initializeResult?: InitializeResult | null;
}

export class McpConnectionInfo {
  private readonly _clientCapabilities: ClientCapabilities;

  private readonly _clientInfo: Implementation;

  private readonly _initializeResult: InitializeResult | null;

  constructor(props: McpConnectionInfoProps) {
    assert(props != null, "props cannot be null");
    assert(
      props.clientCapabilities != null,
      "clientCapabilities cannot be null",
    );
    assert(props.clientInfo != null, "clientInfo cannot be null");

    this._clientCapabilities = props.clientCapabilities;
    this._clientInfo = props.clientInfo;
    this._initializeResult = props.initializeResult ?? null;
  }

  get clientCapabilities(): ClientCapabilities {
    return this._clientCapabilities;
  }

  get clientInfo(): Implementation {
    return this._clientInfo;
  }

  get initializeResult(): InitializeResult | null {
    return this._initializeResult;
  }
}
