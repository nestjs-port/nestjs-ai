/*
 * Copyright 2026-present the original author or authors.
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
  ReadResourceCallback,
  ReadResourceRequest,
  ReadResourceResult,
  McpServer,
  Resource,
  ServerContext,
} from "@modelcontextprotocol/server";
import { UriTemplate } from "@modelcontextprotocol/server";

import type { McpTransportContext } from "../../context/index.js";
import { McpServerExchange } from "../../context/index.js";
import { McpMeta } from "../../mcp-meta.js";
import type { McpResourceMethodArguments } from "../../mcp-resource.js";
import { DefaultMcpReadResourceResultConverter } from "./default-mcp-read-resource-result-converter.js";
import type { McpReadResourceResultConverter } from "./mcp-read-resource-result-converter.js";
import type { ResourceContentType } from "./resource-content-type.js";

const DEFAULT_MIME_TYPE = "text/plain";

export interface McpResourceMethodCallbackProps {
  provider: object;
  propertyKey: string | symbol;
  resource: Resource;
  mcpServer?: McpServer | null;
  resultConverter?: McpReadResourceResultConverter | null;
  contentType?: ResourceContentType | null;
}

export type ResourceRegistration = [
  name: string,
  uriOrTemplate: string,
  config: Parameters<McpServer["registerResource"]>[2],
  callback: ReadResourceCallback,
];

export class McpResourceMethodException extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "McpResourceMethodException";
  }
}

/**
 * Class for creating resource callbacks around methods that operate on an MCP server
 * exchange.
 */
export class McpResourceMethodCallback {
  protected readonly _provider: object;

  protected readonly _propertyKey: string | symbol;

  protected readonly _method: (...args: unknown[]) => unknown;

  protected readonly _resource: Resource;

  protected readonly _mcpServer: McpServer;

  protected readonly _uriTemplate: UriTemplate;

  protected readonly _uriVariables: string[];

  protected readonly _mimeType: string;

  protected readonly _meta: Record<string, unknown> | null;

  protected readonly _resultConverter: McpReadResourceResultConverter;

  protected readonly _contentType: ResourceContentType | null;

  constructor(props: McpResourceMethodCallbackProps) {
    assert(props.provider != null, "Provider can't be null!");
    assert(props.propertyKey != null, "Property key can't be null!");
    assert(props.resource != null, "Resource can't be null!");
    assert(
      props.resource.uri != null && props.resource.uri.length > 0,
      "URI can't be null or empty!",
    );

    this._provider = props.provider;
    this._propertyKey = props.propertyKey;
    this._resource = props.resource;
    this._mcpServer = props.mcpServer ?? ({} as McpServer);
    this._uriTemplate = new UriTemplate(props.resource.uri);
    this._uriVariables = this._uriTemplate.variableNames;
    this._mimeType =
      props.resource.mimeType != null && props.resource.mimeType.length > 0
        ? props.resource.mimeType
        : DEFAULT_MIME_TYPE;
    this._meta = (props.resource._meta as Record<string, unknown>) ?? null;
    this._resultConverter =
      props.resultConverter ?? new DefaultMcpReadResourceResultConverter();
    this._contentType = props.contentType ?? null;
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

  contentType(): ResourceContentType | null {
    return this._contentType;
  }

  toResource(): Resource {
    return this._resource;
  }

  apply(): ResourceRegistration {
    const { name, uri, ...config } = this._resource;
    const resolvedName = name.length > 0 ? name : this.methodName;
    const callback: ReadResourceCallback = async (
      resourceUri: URL,
      ctx: ServerContext,
    ): Promise<ReadResourceResult> => {
      const request: ReadResourceRequest = {
        params: {
          uri: resourceUri.toString(),
          ...(ctx.mcpReq._meta == null ? {} : { _meta: ctx.mcpReq._meta }),
        },
      } as ReadResourceRequest;
      const exchange = new McpServerExchange(this._mcpServer, ctx);
      return this.handle(exchange, request);
    };

    return [resolvedName, uri, config, callback];
  }

  async handle(
    exchange: McpServerExchange,
    request: ReadResourceRequest,
  ): Promise<ReadResourceResult> {
    assert(request != null, "Request must not be null");

    try {
      const args = this.buildArgs(exchange, request);
      const result = await this._method.apply(this._provider, [args]);
      return this._resultConverter.convertToReadResourceResult(
        result,
        request.params.uri,
        this._mimeType,
        this._contentType,
        this._meta,
      );
    } catch (error) {
      throw new McpResourceMethodException(
        `Error invoking resource method: ${this.methodName}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  protected buildArgs(
    exchangeOrContext: unknown,
    request: ReadResourceRequest,
  ): McpResourceMethodArguments {
    const uriVariables = this.extractUriVariables(request.params.uri);
    return {
      exchange: this.isExchangeType(exchangeOrContext)
        ? (exchangeOrContext as never)
        : undefined,
      context: this.resolveTransportContext(exchangeOrContext),
      request,
      resource: this._resource,
      uri: request.params.uri,
      uriVariables,
      meta: new McpMeta(
        (request.params._meta as Record<string, unknown> | undefined) ?? null,
      ),
      progressToken: request.params._meta?.progressToken ?? null,
    };
  }

  protected extractUriVariables(uri: string): Record<string, string> {
    if (this._uriVariables.length === 0) {
      return {};
    }

    const matched = this._uriTemplate.match(uri);
    if (matched == null) {
      throw new Error(
        `Failed to extract all URI variables from request URI: ${uri}. Expected variables: ${this._uriVariables.join(", ")}, but found: <none>`,
      );
    }

    const result: Record<string, string> = {};
    for (const variableName of this._uriVariables) {
      const value = matched[variableName];
      if (value == null) {
        throw new Error(
          `Failed to extract all URI variables from request URI: ${uri}. Expected variables: ${this._uriVariables.join(", ")}, but found: ${Object.keys(matched).join(", ")}`,
        );
      }
      result[variableName] = Array.isArray(value) ? (value[0] ?? "") : value;
    }

    return result;
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

  protected resolveTransportContext(
    exchangeOrContext: unknown,
  ): McpTransportContext | null {
    if (exchangeOrContext instanceof McpServerExchange) {
      return exchangeOrContext.transportContext();
    }
    return null;
  }

  protected isExchangeType(value: unknown): boolean {
    return value instanceof McpServerExchange;
  }
}
