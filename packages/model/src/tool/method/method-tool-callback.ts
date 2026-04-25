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
import { type Logger, LoggerFactory } from "@nestjs-port/core";
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";
import { SchemaError } from "@standard-schema/utils";
import type { ToolContext } from "../../chat/index.js";
import type { ToolDefinition } from "../definition/index.js";
import {
  DefaultToolCallResultConverter,
  type ToolCallResultConverter,
  ToolExecutionException,
} from "../execution/index.js";
import { ToolMetadata } from "../metadata/index.js";
import { ToolCallback } from "../tool-callback.js";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

export interface MethodToolCallbackProps {
  toolDefinition: ToolDefinition;
  toolMetadata?: ToolMetadata | null;
  toolMethod: (...args: never[]) => unknown | Promise<unknown>;
  toolObject?: object | null;
  toolInputSchema?: StandardSchemaWithJsonSchema | null;
  toolResultSchema?: StandardSchemaWithJsonSchema | null;
  toolCallResultConverter?: ToolCallResultConverter | null;
}

export class MethodToolCallback extends ToolCallback {
  private static readonly DEFAULT_RESULT_CONVERTER: ToolCallResultConverter =
    new DefaultToolCallResultConverter();

  private static readonly DEFAULT_TOOL_METADATA: ToolMetadata =
    ToolMetadata.create({});

  private readonly _logger: Logger = LoggerFactory.getLogger(
    MethodToolCallback.name,
  );
  private readonly _toolDefinition: ToolDefinition;
  private readonly _toolMetadata: ToolMetadata;
  private readonly _toolMethod: (
    ...args: never[]
  ) => unknown | Promise<unknown>;
  private readonly _toolObject: object | null;
  private readonly _toolInputSchema: StandardSchemaWithJsonSchema | null;
  private readonly _toolResultSchema: StandardSchemaWithJsonSchema | null;
  private readonly _toolCallResultConverter: ToolCallResultConverter;

  constructor(props: MethodToolCallbackProps) {
    super();
    assert(props.toolDefinition, "toolDefinition cannot be null");
    assert(props.toolMethod, "toolMethod cannot be null");

    this._toolDefinition = props.toolDefinition;
    this._toolMetadata =
      props.toolMetadata ?? MethodToolCallback.DEFAULT_TOOL_METADATA;
    this._toolMethod = props.toolMethod;
    this._toolObject = props.toolObject ?? null;
    this._toolInputSchema = props.toolInputSchema ?? null;
    this._toolResultSchema = props.toolResultSchema ?? null;
    this._toolCallResultConverter =
      props.toolCallResultConverter ??
      MethodToolCallback.DEFAULT_RESULT_CONVERTER;
  }

  override get toolDefinition(): ToolDefinition {
    return this._toolDefinition;
  }

  override get toolMetadata(): ToolMetadata {
    return this._toolMetadata;
  }

  override async call(
    toolInput: string,
    toolContext: ToolContext | null = null,
  ): Promise<string> {
    assert(
      toolInput && toolInput.trim() !== "",
      "toolInput cannot be null or empty",
    );

    this._logger.debug(
      `Starting execution of tool: ${this._toolDefinition.name}`,
    );

    const methodArguments = await this.resolveMethodArguments(
      toolInput,
      toolContext,
    );
    const result = await this.callMethod(methodArguments);

    this._logger.debug(
      `Successful execution of tool: ${this._toolDefinition.name}`,
    );

    return this._toolCallResultConverter.convert(
      result,
      this._toolResultSchema,
    );
  }

  private async resolveMethodArguments(
    toolInput: string,
    toolContext: ToolContext | null,
  ): Promise<unknown[]> {
    try {
      const plain = JSON.parse(toolInput) as unknown;
      const methodArguments = this._toolInputSchema
        ? await this.validateToolInput(plain)
        : [];

      return this._toolInputSchema != null
        ? [...methodArguments, toolContext]
        : [toolContext];
    } catch (ex) {
      this._logger.warn("Conversion from JSON failed", ex as Error);
      throw this.wrapToolExecutionException(ex);
    }
  }

  private async validateToolInput(input: unknown): Promise<unknown[]> {
    const result = await this._toolInputSchema!["~standard"].validate(input);
    if (result.issues) {
      throw new SchemaError(result.issues);
    }
    return [result.value];
  }

  private async callMethod(methodArguments: unknown[]): Promise<unknown> {
    try {
      return await this._toolMethod.apply(
        this._toolObject,
        methodArguments as never[],
      );
    } catch (ex) {
      if (ex instanceof ToolExecutionException) {
        throw ex;
      }
      throw this.wrapToolExecutionException(ex);
    }
  }

  private wrapToolExecutionException(ex: unknown): ToolExecutionException {
    if (ex instanceof Error) {
      return new ToolExecutionException(this._toolDefinition, ex);
    }
    return new ToolExecutionException(
      this._toolDefinition,
      new Error(String(ex)),
    );
  }

  static builder(): MethodToolCallbackBuilder {
    return new MethodToolCallbackBuilder();
  }
}

export class MethodToolCallbackBuilder {
  private _toolDefinition: ToolDefinition | null = null;
  private _toolMetadata: ToolMetadata | null = null;
  private _toolMethod:
    | ((...args: never[]) => unknown | Promise<unknown>)
    | null = null;
  private _toolObject: object | null = null;
  private _toolInputSchema: StandardSchemaWithJsonSchema | null = null;
  private _toolResultSchema: StandardSchemaWithJsonSchema | null = null;
  private _toolCallResultConverter: ToolCallResultConverter | null = null;

  toolDefinition(toolDefinition: ToolDefinition): this {
    this._toolDefinition = toolDefinition;
    return this;
  }

  toolMetadata(toolMetadata: ToolMetadata): this {
    this._toolMetadata = toolMetadata;
    return this;
  }

  toolMethod(
    toolMethod: (...args: never[]) => unknown | Promise<unknown>,
  ): this {
    this._toolMethod = toolMethod;
    return this;
  }

  toolObject(toolObject: object): this {
    this._toolObject = toolObject;
    return this;
  }

  toolInputSchema(toolInputSchema: StandardSchemaWithJsonSchema | null): this {
    this._toolInputSchema = toolInputSchema;
    return this;
  }

  toolResultSchema(
    toolResultSchema: StandardSchemaWithJsonSchema | null,
  ): this {
    this._toolResultSchema = toolResultSchema;
    return this;
  }

  toolCallResultConverter(
    toolCallResultConverter: ToolCallResultConverter,
  ): this {
    this._toolCallResultConverter = toolCallResultConverter;
    return this;
  }

  build(): MethodToolCallback {
    assert(this._toolDefinition, "ToolDefinition is required");
    assert(this._toolMethod, "ToolMethod is required");

    return new MethodToolCallback({
      toolDefinition: this._toolDefinition,
      toolMetadata: this._toolMetadata,
      toolMethod: this._toolMethod,
      toolObject: this._toolObject,
      toolInputSchema: this._toolInputSchema,
      toolResultSchema: this._toolResultSchema,
      toolCallResultConverter: this._toolCallResultConverter,
    });
  }
}
