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

import "reflect-metadata";
import type {
  ReadResourceRequest,
  ReadResourceResult,
} from "@modelcontextprotocol/server";
import { ErrorUtils } from "../../common/index.js";
import {
  DefaultMcpRequestContext,
  McpServerExchange,
} from "../../context/index.js";
import {
  AbstractMcpResourceMethodCallback,
  type AbstractMcpResourceMethodCallbackProps,
} from "./abstract-mcp-resource-method-callback.js";

/**
 * Class for creating callbacks around resource methods with asynchronous processing.
 *
 * This class provides a way to convert methods annotated with `McpResource` into
 * callback functions that can be used to handle resource requests asynchronously. It
 * supports various method signatures and return types, and handles URI template
 * variables.
 */
export class McpResourceMethodCallback extends AbstractMcpResourceMethodCallback {
  constructor(props: AbstractMcpResourceMethodCallbackProps) {
    super(props);
    this.validateMethod();
  }

  protected override assignExchangeType(
    paramType: unknown,
    exchange: unknown,
  ): unknown {
    if (paramType === McpServerExchange) {
      if (exchange instanceof McpServerExchange) {
        return exchange;
      }
      throw new Error(
        `Unsupported exchange type: ${this.describeType(exchange)} for method: ${this.methodName} in ${this.declaringClassName}`,
      );
    }

    // Treat Object-typed params as transport-context style assignments by
    // returning the underlying ServerContext when available.
    if (exchange instanceof McpServerExchange) {
      return exchange.transportContext();
    }

    throw new Error(
      `Unsupported exchange type: ${this.describeType(exchange)} for method: ${this.methodName} in ${this.declaringClassName}`,
    );
  }

  protected override buildRequestContext(
    exchange: unknown,
    request: ReadResourceRequest,
  ): unknown {
    if (!(exchange instanceof McpServerExchange)) {
      throw new Error(
        `Cannot build McpRequestContext without an McpServerExchange: ${this.methodName} in ${this.declaringClassName}`,
      );
    }
    return new DefaultMcpRequestContext({ exchange, request });
  }

  /**
   * Apply the callback to the given exchange and request.
   */
  async apply(
    exchange: McpServerExchange,
    request: ReadResourceRequest,
  ): Promise<ReadResourceResult> {
    if (request == null) {
      throw new TypeError("Request must not be null");
    }

    try {
      // Extract URI variable values from the request URI
      const uriVariableValues = this.extractUriVariables(request.params.uri);

      // Verify all URI variables were extracted if URI variables are expected
      if (
        this._uriVariables.length > 0 &&
        uriVariableValues.size !== this._uriVariables.length
      ) {
        throw new Error(
          `Failed to extract all URI variables from request URI: ${request.params.uri}. Expected variables: ${this._uriVariables.join(", ")}, but found: ${[...uriVariableValues.keys()].join(", ")}`,
        );
      }

      // Build arguments for the method call
      const args = this.buildArgs(exchange, request, uriVariableValues);

      // Invoke the method
      const result = await Promise.resolve(
        this._method.apply(this._bean, args),
      );

      // Convert the result to a ReadResourceResult
      return this._resultConverter.convertToReadResourceResult(
        result,
        request.params.uri,
        this._mimeType,
        this._contentType,
        this._meta,
      );
    } catch (error) {
      const cause = ErrorUtils.findCauseUsingPlainJava(
        error instanceof Error ? error : new Error(String(error)),
      );
      throw new Error(
        `Error invoking resource method: ${this.methodName} in ${this.declaringClassName}. \nCause: ${cause.message}`,
        { cause: error },
      );
    }
  }

  protected override validateReturnType(): void {
    const returnType = Reflect.getMetadata(
      "design:returntype",
      this._target,
      this._propertyKey,
    ) as { name?: string } | undefined;

    // Accepted: undefined (void), Object (interface like ReadResourceResult), Array
    // (List), String, or Promise (Mono).
    if (
      returnType !== undefined &&
      returnType !== Object &&
      returnType !== Array &&
      returnType !== String &&
      returnType !== Promise
    ) {
      throw new Error(
        `Method must return either ReadResourceResult, List<ResourceContents>, List<String>, ResourceContents, String, or Mono<T>: ${this.methodName} in ${this.declaringClassName} returns ${returnType.name ?? "unknown"}`,
      );
    }
  }

  protected override isExchangeOrContextType(paramType: unknown): boolean {
    return paramType === McpServerExchange;
  }

  private extractUriVariables(uri: string): Map<string, string> {
    const result = new Map<string, string>();
    if (this._uriVariables.length === 0) {
      return result;
    }
    // Naive extraction: match positionally using a regex built from the template.
    const pattern = this._uri.replace(/\{([^/]+?)\}/g, "([^/]+)");
    const regex = new RegExp(`^${pattern}$`);
    const match = regex.exec(uri);
    if (match == null) {
      return result;
    }
    for (let i = 0; i < this._uriVariables.length; i += 1) {
      const name = this._uriVariables[i];
      const value = match[i + 1];
      if (name != null && value != null) {
        result.set(name, value);
      }
    }
    return result;
  }

  private describeType(value: unknown): string {
    if (value == null) {
      return "null";
    }
    if (typeof value === "object" && value.constructor?.name) {
      return value.constructor.name;
    }
    return typeof value;
  }

  static builder(): McpResourceMethodCallbackBuilder {
    return new McpResourceMethodCallbackBuilder();
  }
}

/**
 * Builder for creating McpResourceMethodCallback instances.
 */
export class McpResourceMethodCallbackBuilder {
  private _props: Partial<AbstractMcpResourceMethodCallbackProps> = {};

  bean(bean: object | null): this {
    this._props.bean = bean ?? undefined;
    return this;
  }

  method(propertyKey: string | symbol | null): this {
    this._props.propertyKey = propertyKey ?? undefined;
    return this;
  }

  uri(uri: string): this {
    this._props.uri = uri;
    return this;
  }

  name(name: string | null): this {
    this._props.name = name;
    return this;
  }

  description(description: string | null): this {
    this._props.description = description;
    return this;
  }

  mimeType(mimeType: string | null): this {
    this._props.mimeType = mimeType;
    return this;
  }

  contentType(
    contentType: AbstractMcpResourceMethodCallbackProps["contentType"],
  ): this {
    this._props.contentType = contentType;
    return this;
  }

  meta(meta: Record<string, unknown> | null): this {
    this._props.meta = meta;
    return this;
  }

  resultConverter(
    resultConverter: AbstractMcpResourceMethodCallbackProps["resultConverter"],
  ): this {
    this._props.resultConverter = resultConverter;
    return this;
  }

  build(): McpResourceMethodCallback {
    if (this._props.propertyKey == null) {
      throw new Error("Method must not be null");
    }
    if (this._props.bean == null) {
      throw new Error("Bean must not be null");
    }
    if (this._props.uri == null || this._props.uri.length === 0) {
      throw new Error("URI must not be null or empty");
    }
    return new McpResourceMethodCallback(
      this._props as AbstractMcpResourceMethodCallbackProps,
    );
  }
}
