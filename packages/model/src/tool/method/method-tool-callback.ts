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
  toolInputSchema?: z.ZodTypeAny | null;
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
  private readonly _toolInputSchema: z.ZodTypeAny | null;
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

    return this._toolCallResultConverter.convert(result, null);
  }

  private resolveMethodArguments(
    toolInput: string,
    toolContext: ToolContext | null,
  ): unknown[] {
    try {
      const plain = JSON.parse(toolInput) as unknown;
      if (!this._toolInputSchema) {
        return this.toArguments(plain);
      }

      if (this._toolInputSchema === ToolContextSchema) {
        this.assertNonEmptyToolContext(toolContext);
        return [toolContext];
      }

      let input = plain;
      const contextIndexes = this.findToolContextTupleIndexes(
        this._toolInputSchema,
      );
      if (contextIndexes.length > 0) {
        assert(Array.isArray(input), "Tool input must be a JSON array");
        this.assertNonEmptyToolContext(toolContext);

        const tupleInput = [...input];
        for (const index of contextIndexes) {
          tupleInput[index] = toolContext;
        }
        input = tupleInput;
      }

      const parsed = this._toolInputSchema.parse(input);
      return this.toArguments(parsed, this._toolInputSchema);
    } catch (ex) {
      this._logger.warn("Conversion from JSON failed", ex as Error);
      throw this.wrapToolExecutionException(ex);
    }
  }

  private toArguments(
    request: unknown,
    schema: z.ZodTypeAny | null = null,
  ): unknown[] {
    if (schema && this.isTupleSchema(schema)) {
      assert(Array.isArray(request), "Tool input must be a JSON array");
      return [...request];
    }

    if (schema) {
      if (request === undefined) {
        return [];
      }
      return [request];
    }

    if (Array.isArray(request)) {
      return [...request];
    }

    if (request === undefined) {
      return [];
    }

    return [request];
  }

  private isTupleSchema(schema: z.ZodTypeAny): boolean {
    const def = this.getSchemaDef(schema);
    return def?.type === "tuple";
  }

  private findToolContextTupleIndexes(schema: z.ZodTypeAny): number[] {
    const tupleDef = this.getSchemaDef(schema);
    if (tupleDef?.type !== "tuple" || !Array.isArray(tupleDef.items)) {
      return [];
    }

    const indexes: number[] = [];
    for (let index = 0; index < tupleDef.items.length; index += 1) {
      if (tupleDef.items[index] === ToolContextSchema) {
        indexes.push(index);
      }
    }
    return indexes;
  }

  private getSchemaDef(
    schema: z.ZodTypeAny,
  ): { type?: unknown; items?: unknown } | null {
    const def = (
      schema as { _zod?: { def?: { type?: unknown; items?: unknown } } }
    )._zod?.def;
    return def ?? null;
  }

  private assertNonEmptyToolContext(toolContext: ToolContext | null): void {
    assert(
      toolContext != null && Object.keys(toolContext.context).length > 0,
      "ToolContext is required by the method as an argument",
    );
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
  private _toolInputSchema: z.ZodTypeAny | null = null;
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

  toolInputSchema(toolInputSchema: z.ZodTypeAny): this {
    this._toolInputSchema = toolInputSchema;
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
      toolCallResultConverter: this._toolCallResultConverter,
    });
  }
}
