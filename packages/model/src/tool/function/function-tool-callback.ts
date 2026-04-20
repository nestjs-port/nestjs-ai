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
import type { z } from "zod";
import type { ToolContext } from "../../chat";
import { DefaultToolDefinition, type ToolDefinition } from "../definition";
import {
  DefaultToolCallResultConverter,
  type ToolCallResultConverter,
  ToolExecutionException,
} from "../execution";
import { ToolMetadata } from "../metadata";
import { ToolUtils } from "../support";
import { ToolCallback } from "../tool-callback";

type MaybePromise<T> = T | Promise<T>;
type ToolInputObject = Record<string, unknown>;
type ToolInputSchema = z.ZodObject<z.ZodRawShape>;

export type ToolBiFunction<I extends ToolInputObject, O> = (
  input: I,
  context: ToolContext | null,
) => MaybePromise<O>;
export type ToolFunction<I extends ToolInputObject, O> = (
  input: I,
) => MaybePromise<O>;
export type ToolSupplier<O> = () => MaybePromise<O>;
export type ToolConsumer<I extends ToolInputObject> = (
  input: I,
) => MaybePromise<void>;

/**
 * Runtime input type used by {@link FunctionToolCallbackBuilder} for schema hints.
 */
/**
 * A {@link ToolCallback} implementation to invoke functions as tools.
 */
export class FunctionToolCallback<
  I extends ToolInputObject,
  O,
> extends ToolCallback {
  private static readonly DEFAULT_RESULT_CONVERTER: ToolCallResultConverter =
    new DefaultToolCallResultConverter();

  private static readonly DEFAULT_TOOL_METADATA: ToolMetadata =
    ToolMetadata.create({});

  private readonly _logger: Logger = LoggerFactory.getLogger(
    FunctionToolCallback.name,
  );
  private readonly _toolDefinition: ToolDefinition;
  private readonly _toolMetadata: ToolMetadata;
  private readonly _toolInputType: ToolInputSchema;
  private readonly _toolFunction: ToolBiFunction<I, O>;
  private readonly _toolCallResultConverter: ToolCallResultConverter;

  constructor(props: FunctionToolCallbackProps<I, O>) {
    super();
    assert(props.toolDefinition, "toolDefinition cannot be null");
    assert(props.toolInputType, "toolInputType cannot be null");
    assert(props.toolFunction, "toolFunction cannot be null");

    this._toolDefinition = props.toolDefinition;
    this._toolMetadata =
      props.toolMetadata ?? FunctionToolCallback.DEFAULT_TOOL_METADATA;
    this._toolInputType = props.toolInputType;
    this._toolFunction = props.toolFunction;
    this._toolCallResultConverter =
      props.toolCallResultConverter ??
      FunctionToolCallback.DEFAULT_RESULT_CONVERTER;
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

    const request = this.parseToolInput(toolInput);
    const response = await this.callMethod(request, toolContext);

    this._logger.debug(
      `Successful execution of tool: ${this._toolDefinition.name}`,
    );

    return this._toolCallResultConverter.convert(response, null);
  }

  private parseToolInput(toolInput: string): I {
    const plain = JSON.parse(toolInput);
    return this._toolInputType.parse(plain) as I;
  }

  private async callMethod(
    request: I,
    toolContext: ToolContext | null,
  ): Promise<O> {
    try {
      return await this._toolFunction(request, toolContext);
    } catch (ex) {
      if (ex instanceof ToolExecutionException) {
        throw ex;
      }
      if (ex instanceof Error) {
        throw new ToolExecutionException(this._toolDefinition, ex);
      }
      throw new ToolExecutionException(
        this._toolDefinition,
        new Error(String(ex)),
      );
    }
  }

  static builder<I extends ToolInputObject, O>(
    name: string,
    functionOrSupplierOrConsumer: ToolBiFunction<I, O>,
  ): FunctionToolCallbackBuilder<I, O>;
  static builder<I extends ToolInputObject, O>(
    name: string,
    functionOrSupplierOrConsumer: ToolFunction<I, O>,
  ): FunctionToolCallbackBuilder<I, O>;
  static builder<O>(
    name: string,
    functionOrSupplierOrConsumer: ToolSupplier<O>,
  ): FunctionToolCallbackBuilder<Record<string, never>, O>;
  static builder<I extends ToolInputObject>(
    name: string,
    functionOrSupplierOrConsumer: ToolConsumer<I>,
  ): FunctionToolCallbackBuilder<I, void>;
  static builder<I extends ToolInputObject, O>(
    name: string,
    functionOrSupplierOrConsumer:
      | ToolBiFunction<I, O>
      | ToolFunction<I, O>
      | ToolSupplier<O>
      | ToolConsumer<I>,
  ):
    | FunctionToolCallbackBuilder<I, O>
    | FunctionToolCallbackBuilder<Record<string, never>, O> {
    assert(functionOrSupplierOrConsumer, "function cannot be null");

    if (functionOrSupplierOrConsumer.length === 0) {
      const supplier = functionOrSupplierOrConsumer as ToolSupplier<O>;
      return new FunctionToolCallbackBuilder<Record<string, never>, O>(
        name,
        (_request, _context) => supplier(),
      );
    }

    if (functionOrSupplierOrConsumer.length === 1) {
      const functionOrConsumer = functionOrSupplierOrConsumer as
        | ToolFunction<I, O>
        | ToolConsumer<I>;
      return new FunctionToolCallbackBuilder<I, O>(
        name,
        (request, _context) => functionOrConsumer(request) as O,
      );
    }

    return new FunctionToolCallbackBuilder<I, O>(
      name,
      functionOrSupplierOrConsumer as ToolBiFunction<I, O>,
    );
  }
}

export interface FunctionToolCallbackProps<I extends ToolInputObject, O> {
  toolDefinition: ToolDefinition;
  toolMetadata?: ToolMetadata | null;
  toolInputType: ToolInputSchema;
  toolFunction: ToolBiFunction<I, O>;
  toolCallResultConverter?: ToolCallResultConverter | null;
}

export class FunctionToolCallbackBuilder<I extends ToolInputObject, O> {
  private readonly _name: string;
  private _description: string | null = null;
  private _inputSchema: string | null = null;
  private _inputType: ToolInputSchema | null = null;
  private _toolMetadata: ToolMetadata | null = null;
  private readonly _toolFunction: ToolBiFunction<I, O>;
  private _toolCallResultConverter: ToolCallResultConverter | null = null;

  constructor(name: string, toolFunction: ToolBiFunction<I, O>) {
    assert(name && name.trim() !== "", "name cannot be null or empty");
    assert(toolFunction, "toolFunction cannot be null");
    this._name = name;
    this._toolFunction = toolFunction;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  inputSchema(inputSchema: string): this {
    this._inputSchema = inputSchema;
    return this;
  }

  inputType(inputType: ToolInputSchema): this {
    this._inputType = inputType;
    return this;
  }

  toolMetadata(toolMetadata: ToolMetadata): this {
    this._toolMetadata = toolMetadata;
    return this;
  }

  toolCallResultConverter(
    toolCallResultConverter: ToolCallResultConverter,
  ): this {
    this._toolCallResultConverter = toolCallResultConverter;
    return this;
  }

  build(): FunctionToolCallback<I, O> {
    assert(this._inputType, "inputType cannot be null");

    const description =
      this._description && this._description.trim() !== ""
        ? this._description
        : ToolUtils.getToolDescriptionFromName(this._name);

    const inputSchema =
      this._inputSchema && this._inputSchema.trim() !== ""
        ? this._inputSchema
        : FunctionToolCallbackBuilder.generateSchemaForType(this._inputType);

    const toolDefinition = DefaultToolDefinition.builder()
      .name(this._name)
      .description(description)
      .inputSchema(inputSchema)
      .build();

    return new FunctionToolCallback<I, O>({
      toolDefinition,
      toolMetadata: this._toolMetadata,
      toolInputType: this._inputType,
      toolFunction: this._toolFunction,
      toolCallResultConverter: this._toolCallResultConverter,
    });
  }

  private static generateSchemaForType(inputType: ToolInputSchema): string {
    try {
      const schema = inputType.toJSONSchema();
      return JSON.stringify(schema);
    } catch {
      return "{}";
    }
  }
}
