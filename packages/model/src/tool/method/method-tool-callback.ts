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
import { type Logger, LoggerFactory } from "@nestjs-ai/commons";
import type { z } from "zod";
import { type ToolContext, ToolContextSchema } from "../../chat";
import type { ToolDefinition } from "../definition";
import {
  DefaultToolCallResultConverter,
  type ToolCallResultConverter,
  ToolExecutionException,
} from "../execution";
import { ToolMetadata } from "../metadata";
import { ToolCallback } from "../tool-callback";

export interface MethodToolCallbackProps {
  toolDefinition: ToolDefinition;
  toolMetadata?: ToolMetadata | null;
  toolMethod: (...args: never[]) => unknown | Promise<unknown>;
  toolObject?: object | null;
  toolInputSchema?: z.ZodObject<z.ZodRawShape> | null;
  toolResultSchema?: z.ZodTypeAny | null;
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
  private readonly _toolInputSchema: z.ZodObject<z.ZodRawShape> | null;
  private readonly _toolResultSchema: z.ZodTypeAny | null;
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

    const methodArguments = this.resolveMethodArguments(toolInput, toolContext);
    const result = await this.callMethod(methodArguments);

    this._logger.debug(
      `Successful execution of tool: ${this._toolDefinition.name}`,
    );

    return this._toolCallResultConverter.convert(
      result,
      this._toolResultSchema,
    );
  }

  private resolveMethodArguments(
    toolInput: string,
    toolContext: ToolContext | null,
  ): unknown[] {
    try {
      const plain = JSON.parse(toolInput) as unknown;
      if (!this._toolInputSchema) {
        return [];
      }
      const preparedInput = this.injectToolContextFields(plain, toolContext);
      const parsed = this._toolInputSchema.parse(preparedInput);
      return [parsed];
    } catch (ex) {
      this._logger.warn("Conversion from JSON failed", ex as Error);
      throw this.wrapToolExecutionException(ex);
    }
  }

  private injectToolContextFields(
    input: unknown,
    toolContext: ToolContext | null,
  ): unknown {
    if (!this._toolInputSchema || input == null || typeof input !== "object") {
      return input;
    }

    const shape = this.getObjectShape(this._toolInputSchema);
    if (!shape) {
      return input;
    }

    const source = input as Record<string, unknown>;
    const next = { ...source };
    for (const [field, schema] of Object.entries(shape)) {
      if (schema !== ToolContextSchema) {
        continue;
      }

      if (toolContext != null) {
        next[field] = toolContext;
      }
    }

    return next;
  }

  private getObjectShape(
    schema: z.ZodObject<z.ZodRawShape>,
  ): Record<string, z.ZodTypeAny> | null {
    const shape = (
      schema as unknown as {
        _zod?: { def?: { shape?: Record<string, z.ZodTypeAny> } };
      }
    )._zod?.def?.shape;
    return shape ?? null;
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
  private _toolInputSchema: z.ZodObject<z.ZodRawShape> | null = null;
  private _toolResultSchema: z.ZodTypeAny | null = null;
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

  toolInputSchema(toolInputSchema: z.ZodObject<z.ZodRawShape> | null): this {
    this._toolInputSchema = toolInputSchema;
    return this;
  }

  toolResultSchema(toolResultSchema: z.ZodTypeAny | null): this {
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
