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
import assert from "node:assert/strict";
import type {
  ReadResourceRequest,
  Resource,
} from "@modelcontextprotocol/server";
import { UriTemplate } from "@modelcontextprotocol/server";
import { McpMeta } from "../../mcp-meta.js";
import { MCP_PROGRESS_TOKEN_METADATA_KEY } from "../../metadata.js";
import type { McpReadResourceResultConverter } from "./mcp-read-resource-result-converter.js";
import { DefaultMcpReadResourceResultConverter } from "./default-mcp-read-resource-result-converter.js";
import type { ResourceContentType } from "./resource-content-type.js";

const DEFAULT_MIME_TYPE = "text/plain";

export interface AbstractMcpResourceMethodCallbackProps {
  bean: object;
  propertyKey: string | symbol;
  uri: string;
  name?: string | null;
  description?: string | null;
  mimeType?: string | null;
  resultConverter?: McpReadResourceResultConverter | null;
  contentType?: ResourceContentType | null;
  meta?: Record<string, unknown> | null;
}

/**
 * Abstract base class for creating callbacks around resource methods.
 *
 * This class provides common functionality for both synchronous and asynchronous resource
 * method callbacks. It contains shared logic for method validation, argument building,
 * and other common operations.
 */
export abstract class AbstractMcpResourceMethodCallback {
  protected readonly _bean: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _target: object;

  protected readonly _method: (...args: unknown[]) => unknown;

  protected readonly _uri: string;

  protected readonly _name: string;

  protected readonly _description: string | null;

  protected readonly _mimeType: string;

  protected readonly _uriTemplate: UriTemplate;

  protected readonly _uriVariables: string[];

  protected readonly _resultConverter: McpReadResourceResultConverter;

  protected readonly _contentType: ResourceContentType | null;

  protected readonly _meta: Record<string, unknown> | null;

  protected constructor(props: AbstractMcpResourceMethodCallbackProps) {
    assert(
      props.uri != null && props.uri.length > 0,
      "URI can't be null or empty!",
    );
    assert(props.propertyKey != null, "Method can't be null!");
    assert(props.bean != null, "Bean can't be null!");

    this._bean = props.bean;
    this._propertyKey = props.propertyKey;
    this._target = Object.getPrototypeOf(props.bean) as object;

    const candidate = (props.bean as Record<string | symbol, unknown>)[
      props.propertyKey
    ];
    if (typeof candidate !== "function") {
      throw new Error(
        `Method must not be null: ${String(props.propertyKey)} in ${this._bean.constructor?.name ?? "<anonymous>"}`,
      );
    }
    this._method = candidate as (...args: unknown[]) => unknown;

    this._uri = props.uri;
    this._name = props.name ?? this.methodName;
    this._description = props.description ?? null;
    this._mimeType = props.mimeType ?? DEFAULT_MIME_TYPE;

    this._uriTemplate = new UriTemplate(this._uri);
    this._uriVariables = this._uriTemplate.variableNames;

    this._resultConverter =
      props.resultConverter ?? new DefaultMcpReadResourceResultConverter();
    this._contentType = props.contentType ?? null;
    this._meta = props.meta ?? null;
  }

  protected get methodName(): string {
    return typeof this._propertyKey === "string"
      ? this._propertyKey
      : this._propertyKey.toString();
  }

  protected get declaringClassName(): string {
    return this._bean.constructor?.name ?? "<anonymous>";
  }

  protected get paramTypes(): unknown[] {
    return (
      (Reflect.getMetadata(
        "design:paramtypes",
        this._target,
        this._propertyKey,
      ) as unknown[] | undefined) ?? []
    );
  }

  protected get paramNames(): string[] {
    const source = Function.prototype.toString.call(this._method);
    const cleaned = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    const match = cleaned.match(/^[^(]*\(([^)]*)\)/s);
    if (match == null || match[1].trim().length === 0) {
      return [];
    }
    return match[1]
      .split(",")
      .map((part) => part.trim())
      .map((part) => part.replace(/=.*$/, "").replace(/^\.\.\./, ""))
      .filter((part) => part.length > 0);
  }

  protected get progressTokenIndices(): Set<number> {
    const map =
      (Reflect.getMetadata(
        MCP_PROGRESS_TOKEN_METADATA_KEY,
        this._target,
        this._propertyKey,
      ) as Record<number, true> | undefined) ?? {};
    return new Set(Object.keys(map).map((index) => Number(index)));
  }

  /**
   * Validates that the method signature is compatible with the resource callback.
   * @throws Error if the method signature is not compatible
   */
  protected validateMethod(): void {
    this.validateReturnType();

    if (this._uriVariables.length === 0) {
      this.validateParametersWithoutUriVariables();
    } else {
      this.validateParametersWithUriVariables();
    }
  }

  /**
   * Validates that the method return type is compatible with the resource callback.
   * Subclasses implement specific return type validation.
   * @throws Error if the return type is not compatible
   */
  protected abstract validateReturnType(): void;

  /**
   * Validates method parameters when no URI variables are present.
   */
  protected validateParametersWithoutUriVariables(): void {
    const paramTypes = this.paramTypes;
    const paramNames = this.paramNames;
    const progressTokens = this.progressTokenIndices;

    let nonSpecialParamCount = 0;
    for (let i = 0; i < paramTypes.length; i += 1) {
      if (progressTokens.has(i)) continue;
      const paramType = paramTypes[i];
      const paramName = paramNames[i] ?? "";
      if (paramType === McpMeta) continue;
      if (this.isRequestContextName(paramName)) continue;
      if (this.isExchangeOrContextType(paramType)) continue;
      nonSpecialParamCount += 1;
    }

    if (nonSpecialParamCount > 2) {
      throw new Error(
        `Method can have at most 2 input parameters (excluding @McpProgressToken and McpMeta) when no URI variables are present: ${this.methodName} in ${this.declaringClassName} has ${nonSpecialParamCount} non-special parameters`,
      );
    }

    let hasValidParams = false;
    let hasExchangeParam = false;
    let hasRequestOrUriParam = false;
    let hasMetaParam = false;
    let hasRequestContextParam = false;

    for (let i = 0; i < paramTypes.length; i += 1) {
      if (progressTokens.has(i)) continue;
      const paramType = paramTypes[i] as { name?: string } | undefined;
      const paramName = paramNames[i] ?? "";

      if (paramType === McpMeta) {
        if (hasMetaParam) {
          throw new Error(
            `Method cannot have more than one McpMeta parameter: ${this.methodName} in ${this.declaringClassName}`,
          );
        }
        hasMetaParam = true;
      } else if (this.isExchangeOrContextType(paramType)) {
        if (hasExchangeParam) {
          throw new Error(
            `Method cannot have more than one exchange parameter: ${this.methodName} in ${this.declaringClassName}`,
          );
        }
        hasExchangeParam = true;
      } else if (this.isRequestContextName(paramName)) {
        if (hasRequestContextParam) {
          throw new Error(
            `Method cannot have more than one request context parameter: ${this.methodName} in ${this.declaringClassName}`,
          );
        }
        hasRequestContextParam = true;
      } else if (
        paramType === String ||
        paramType === Object ||
        this.isRequestName(paramName)
      ) {
        if (hasRequestOrUriParam) {
          throw new Error(
            `Method cannot have more than one ReadResourceRequest or String parameter: ${this.methodName} in ${this.declaringClassName}`,
          );
        }
        hasRequestOrUriParam = true;
        hasValidParams = true;
      } else {
        throw new Error(
          `Method parameters must be exchange, ReadResourceRequest, String, McpMeta, or @McpProgressToken when no URI variables are present: ${this.methodName} in ${this.declaringClassName} has parameter of type ${paramType?.name ?? "unknown"}`,
        );
      }
    }

    if (!hasValidParams && nonSpecialParamCount > 0) {
      throw new Error(
        `Method must have either ReadResourceRequest or String parameter when no URI variables are present: ${this.methodName} in ${this.declaringClassName}`,
      );
    }
  }

  protected validateParamType(_paramType: unknown): void {
    // Subclasses can override to reject specific types.
  }

  /**
   * Validates method parameters when URI variables are present.
   */
  protected validateParametersWithUriVariables(): void {
    const paramTypes = this.paramTypes;
    const paramNames = this.paramNames;
    const progressTokens = this.progressTokenIndices;

    let exchangeParamCount = 0;
    let requestParamCount = 0;
    let progressTokenParamCount = 0;
    let metaParamCount = 0;
    let hasRequestContextParam = false;

    for (let i = 0; i < paramTypes.length; i += 1) {
      if (progressTokens.has(i)) {
        progressTokenParamCount += 1;
        continue;
      }
      const paramType = paramTypes[i];
      const paramName = paramNames[i] ?? "";

      this.validateParamType(paramType);

      if (paramType === McpMeta) {
        metaParamCount += 1;
      } else if (this.isExchangeOrContextType(paramType)) {
        exchangeParamCount += 1;
      } else if (this.isRequestName(paramName) && paramType === Object) {
        requestParamCount += 1;
      } else if (this.isRequestContextName(paramName)) {
        if (hasRequestContextParam) {
          throw new Error(
            `Method cannot have more than one request context parameter: ${this.methodName} in ${this.declaringClassName}`,
          );
        }
        hasRequestContextParam = true;
      }
    }

    if (exchangeParamCount > 1) {
      throw new Error(
        `Method cannot have more than one exchange parameter: ${this.methodName} in ${this.declaringClassName}`,
      );
    }

    if (requestParamCount > 1) {
      throw new Error(
        `Method cannot have more than one ReadResourceRequest parameter: ${this.methodName} in ${this.declaringClassName}`,
      );
    }

    if (metaParamCount > 1) {
      throw new Error(
        `Method cannot have more than one McpMeta parameter: ${this.methodName} in ${this.declaringClassName}`,
      );
    }

    const requestContextParamCount = hasRequestContextParam ? 1 : 0;
    const specialParamCount =
      exchangeParamCount +
      requestParamCount +
      progressTokenParamCount +
      metaParamCount +
      requestContextParamCount;
    const uriVarParamCount = paramTypes.length - specialParamCount;

    if (uriVarParamCount !== this._uriVariables.length) {
      throw new Error(
        `Method must have parameters for all URI variables. Expected ${this._uriVariables.length} URI variable parameters, but found ${uriVarParamCount}: ${this.methodName} in ${this.declaringClassName}. URI variables: ${this._uriVariables.join(", ")}`,
      );
    }

    // Check that all non-special parameters are String type (for URI variables)
    for (let i = 0; i < paramTypes.length; i += 1) {
      if (progressTokens.has(i)) continue;
      const paramType = paramTypes[i] as { name?: string } | undefined;
      const paramName = paramNames[i] ?? "";

      if (
        paramType !== McpMeta &&
        !this.isExchangeOrContextType(paramType) &&
        !(this.isRequestName(paramName) && paramType === Object) &&
        !this.isRequestContextName(paramName) &&
        paramType !== String
      ) {
        throw new Error(
          `URI variable parameters must be of type String: ${this.methodName} in ${this.declaringClassName}, parameter of type ${paramType?.name ?? "unknown"} is not valid`,
        );
      }
    }
  }

  protected abstract assignExchangeType(
    paramType: unknown,
    exchange: unknown,
  ): unknown;

  /**
   * Builds the arguments array for invoking the method.
   */
  protected buildArgs(
    exchange: unknown,
    request: ReadResourceRequest,
    uriVariableValues: Map<string, string>,
  ): unknown[] {
    const paramTypes = this.paramTypes;
    const paramNames = this.paramNames;
    const progressTokens = this.progressTokenIndices;
    const args: unknown[] = Array.from({ length: paramTypes.length });
    const progressTokenSentinel = Symbol("progressToken");

    // First pass: handle @McpProgressToken, McpMeta, exchange, and request context params
    for (let i = 0; i < paramTypes.length; i += 1) {
      const paramType = paramTypes[i];
      const paramName = paramNames[i] ?? "";

      if (progressTokens.has(i)) {
        args[i] =
          (request?.params._meta as { progressToken?: unknown } | undefined)
            ?.progressToken ?? null;
        // mark assigned via sentinel so we don't reassign in URI var pass
        if (args[i] === undefined) {
          args[i] = progressTokenSentinel;
        }
      } else if (paramType === McpMeta) {
        args[i] = new McpMeta(
          (request?.params._meta as Record<string, unknown> | undefined) ??
            null,
        );
      } else if (this.isExchangeOrContextType(paramType)) {
        args[i] = this.assignExchangeType(paramType, exchange);
      } else if (this.isRequestContextName(paramName)) {
        args[i] = this.buildRequestContext(exchange, request);
      }
    }

    if (this._uriVariables.length === 0) {
      this.buildArgsWithoutUriVariables(args, paramTypes, paramNames, request);
    } else {
      this.buildArgsWithUriVariables(
        args,
        paramTypes,
        paramNames,
        request,
        uriVariableValues,
      );
    }

    // Replace sentinel with null
    for (let i = 0; i < args.length; i += 1) {
      if (args[i] === progressTokenSentinel) {
        args[i] = null;
      }
    }

    return args;
  }

  protected abstract buildRequestContext(
    exchange: unknown,
    request: ReadResourceRequest,
  ): unknown;

  protected buildArgsWithUriVariables(
    args: unknown[],
    paramTypes: unknown[],
    paramNames: string[],
    request: ReadResourceRequest,
    uriVariableValues: Map<string, string>,
  ): void {
    const progressTokens = this.progressTokenIndices;

    // First pass: assign request param if matched by name and Object type
    for (let i = 0; i < paramTypes.length; i += 1) {
      if (progressTokens.has(i)) continue;
      if (args[i] !== undefined) continue;
      const paramType = paramTypes[i];
      const paramName = paramNames[i] ?? "";
      if (this.isRequestName(paramName) && paramType === Object) {
        args[i] = request;
      }
    }

    // Second pass: assign URI variables to the remaining parameters
    let variableIndex = 0;
    const assignedVariables: string[] = [];
    for (let i = 0; i < paramTypes.length; i += 1) {
      if (progressTokens.has(i)) continue;
      if (args[i] !== undefined) continue;

      if (variableIndex < this._uriVariables.length) {
        const variableName = this._uriVariables[variableIndex];
        if (variableName != null) {
          args[i] = uriVariableValues.get(variableName);
          assignedVariables.push(variableName);
        }
        variableIndex += 1;
      }
    }

    if (assignedVariables.length !== this._uriVariables.length) {
      throw new Error(
        `Failed to assign all URI variables to method parameters. Assigned: ${assignedVariables.join(", ")}, Expected: ${this._uriVariables.join(", ")}`,
      );
    }
  }

  protected buildArgsWithoutUriVariables(
    args: unknown[],
    paramTypes: unknown[],
    paramNames: string[],
    request: ReadResourceRequest,
  ): void {
    const progressTokens = this.progressTokenIndices;

    for (let i = 0; i < paramTypes.length; i += 1) {
      if (progressTokens.has(i)) continue;
      if (args[i] !== undefined) continue;

      const paramType = paramTypes[i];
      const paramName = paramNames[i] ?? "";

      if (paramType === Object || this.isRequestName(paramName)) {
        args[i] = request;
      } else if (paramType === String) {
        args[i] = request.params.uri;
      } else {
        args[i] = null;
      }
    }
  }

  protected isRequestName(name: string): boolean {
    const lower = name.toLowerCase();
    return (
      lower === "request" ||
      lower === "req" ||
      (lower.includes("request") && !lower.includes("context"))
    );
  }

  protected isRequestContextName(name: string): boolean {
    const lower = name.toLowerCase();
    return (
      lower === "ctx" ||
      lower === "context" ||
      lower.endsWith("requestcontext") ||
      lower.endsWith("context")
    );
  }

  /**
   * Checks if a parameter type is compatible with the exchange or transport context type.
   * Implemented by subclasses.
   */
  protected abstract isExchangeOrContextType(paramType: unknown): boolean;

  /**
   * Returns the content type of the resource.
   */
  contentType(): ResourceContentType | null {
    return this._contentType;
  }

  /**
   * Returns the resource model derived from the configured fields.
   */
  toResource(): Resource {
    return {
      uri: this._uri,
      name: this._name,
      description: this._description ?? undefined,
      mimeType: this._mimeType,
      _meta: this._meta ?? undefined,
    } as unknown as Resource;
  }
}
