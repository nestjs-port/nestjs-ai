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
import {
  AiOperationMetadata,
  AiOperationType,
  AiProvider,
  ObservationContext,
} from "@nestjs-ai/commons";
import type { ToolDefinition } from "../definition";
import { ToolMetadata } from "../metadata";

export interface ToolCallingObservationContextProps {
  toolDefinition: ToolDefinition;
  toolMetadata?: ToolMetadata;
  toolCallArguments?: string | null;
  toolCallResult?: string | null;
}

export class ToolCallingObservationContext extends ObservationContext {
  private readonly _operationMetadata = new AiOperationMetadata(
    AiOperationType.FRAMEWORK.value,
    AiProvider.SPRING_AI.value,
  );

  private readonly _toolDefinition: ToolDefinition;
  private readonly _toolMetadata: ToolMetadata;
  private readonly _toolCallArguments: string;
  private _toolCallResult: string | null;

  constructor(props: ToolCallingObservationContextProps) {
    super();
    assert(props.toolDefinition != null, "toolDefinition cannot be null");

    this._toolDefinition = props.toolDefinition;
    this._toolMetadata = props.toolMetadata ?? ToolMetadata.create({});
    this._toolCallArguments = props.toolCallArguments ?? "{}";
    this._toolCallResult = props.toolCallResult ?? null;
  }

  get operationMetadata(): AiOperationMetadata {
    return this._operationMetadata;
  }

  get toolDefinition(): ToolDefinition {
    return this._toolDefinition;
  }

  get toolMetadata(): ToolMetadata {
    return this._toolMetadata;
  }

  get toolCallArguments(): string {
    return this._toolCallArguments;
  }

  get toolCallResult(): string | null {
    return this._toolCallResult;
  }

  setToolCallResult(toolCallResult: string | null): void {
    this._toolCallResult = toolCallResult;
  }
}
