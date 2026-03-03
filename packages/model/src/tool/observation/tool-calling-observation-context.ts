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

  set toolCallResult(toolCallResult: string | null) {
    this._toolCallResult = toolCallResult;
  }
}
