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
  GetPromptRequest,
  GetPromptResult,
  Prompt,
  PromptMessage,
  TextContent,
} from "@modelcontextprotocol/server";
import type {
  StandardJSONSchemaV1,
  StandardSchemaV1,
} from "@standard-schema/spec";

import type { McpTransportContext } from "../../context/index.js";
import { McpMeta } from "../../mcp-meta.js";
import type { McpPromptMethodContext } from "../../mcp-prompt.js";

type StandardSchemaWithJsonSchema = StandardSchemaV1 & StandardJSONSchemaV1;

export interface AbstractMcpPromptMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
  prompt: Prompt;
  argsSchema?: StandardSchemaWithJsonSchema | null;
}

export class McpPromptMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpPromptMethodException";
  }
}

/**
 * Abstract base class for creating callbacks around prompt methods.
 */
export abstract class AbstractMcpPromptMethodCallback {
  protected readonly _provider: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _method: (...args: unknown[]) => unknown;

  protected readonly _prompt: Prompt;

  protected readonly _argsSchema: StandardSchemaWithJsonSchema | null;

  protected constructor(props: AbstractMcpPromptMethodCallbackProps) {
    assert(props.provider != null, "Provider can't be null!");
    assert(props.propertyKey != null, "Property key can't be null!");
    assert(props.prompt != null, "Prompt can't be null!");

    this._provider = props.provider;
    this._propertyKey = props.propertyKey;
    this._prompt = props.prompt;
    this._argsSchema = props.argsSchema ?? null;
    this._method = this.resolveMethod();
  }

  protected get methodName(): string {
    return typeof this._propertyKey === "string"
      ? this._propertyKey
      : this._propertyKey.toString();
  }

  protected get declaringClassName(): string {
    return this._provider.constructor?.name ?? "<anonymous>";
  }

  protected async buildArgs(
    exchangeOrContext: unknown,
    request: GetPromptRequest,
  ): Promise<[Record<string, unknown>, McpPromptMethodContext]> {
    const rawArguments = { ...request.params.arguments };
    const promptArguments: McpPromptMethodContext = {
      exchange: this.isExchangeType(exchangeOrContext)
        ? (exchangeOrContext as never)
        : undefined,
      transportContext: this.resolveTransportContext(exchangeOrContext),
      request,
      prompt: this._prompt,
      meta: new McpMeta(request.params._meta ?? null),
      progressToken: request.params._meta?.progressToken ?? null,
    };

    if (this._argsSchema != null) {
      const validated =
        await this._argsSchema["~standard"].validate(rawArguments);
      if (validated.issues) {
        throw new Error("Invalid prompt arguments");
      }
      return [validated.value as Record<string, unknown>, promptArguments];
    }

    return [{}, promptArguments];
  }

  protected abstract resolveTransportContext(
    exchangeOrContext: unknown,
  ): McpTransportContext | null;

  protected abstract isExchangeType(paramType: unknown): boolean;

  protected convertToGetPromptResult(result: unknown): GetPromptResult {
    if (this.isGetPromptResult(result)) {
      return result;
    }

    if (Array.isArray(result)) {
      if (result.length === 0) {
        return { messages: [] };
      }

      if (typeof result[0] === "string") {
        return { messages: this.toPromptMessages(result as string[]) };
      }

      return { messages: result as PromptMessage[] };
    }

    if (this.isPromptMessage(result)) {
      return { messages: [result] };
    }

    if (typeof result === "string") {
      return { messages: this.toPromptMessages([result]) };
    }

    throw new Error(
      `Unsupported result type: ${result == null ? "null" : this.getTypeName(result)}`,
    );
  }

  protected resolveMethod(): (...args: unknown[]) => unknown {
    const candidate = (this._provider as Record<string | symbol, unknown>)[
      this._propertyKey
    ];
    assert(
      typeof candidate === "function",
      `Method not found: ${String(this._propertyKey)}`,
    );
    return candidate as (...args: unknown[]) => unknown;
  }

  protected toPromptMessages(values: string[]): PromptMessage[] {
    return values.map((text) => ({
      role: "assistant",
      content: { type: "text", text } as TextContent,
    }));
  }

  protected isGetPromptResult(value: unknown): value is GetPromptResult {
    return typeof value === "object" && value != null && "messages" in value;
  }

  protected isPromptMessage(value: unknown): value is PromptMessage {
    return (
      typeof value === "object" &&
      value != null &&
      "role" in value &&
      "content" in value
    );
  }

  protected getTypeName(value: unknown): string {
    if (value == null) {
      return "unknown";
    }
    if (typeof value === "function" && value.name.length > 0) {
      return value.name;
    }
    if (typeof value === "object" && value.constructor?.name) {
      return value.constructor.name;
    }
    return typeof value;
  }
}
