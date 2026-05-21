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
  ReadResourceTemplateCallback,
  ReadResourceRequest,
  ReadResourceResult,
  McpServer,
  Resource,
  ResourceTemplate,
  ServerContext,
  Variables,
} from "@modelcontextprotocol/server";
import { McpServerExchange } from "@nestjs-ai/mcp-common";
import type { McpTransportContext } from "@nestjs-ai/mcp-common";
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
  resourceTemplate?: ResourceTemplate | null;
  mcpServer?: McpServer | null;
  resultConverter?: McpReadResourceResultConverter | null;
  contentType?: ResourceContentType | null;
}

export type StaticResourceRegistration = [
  name: string,
  uri: string,
  config: Parameters<McpServer["registerResource"]>[2],
  callback: ReadResourceCallback,
];

export type TemplateResourceRegistration = [
  name: string,
  resourceTemplate: ResourceTemplate,
  config: Parameters<McpServer["registerResource"]>[2],
  callback: ReadResourceTemplateCallback,
];

export type ResourceRegistration =
  | StaticResourceRegistration
  | TemplateResourceRegistration;

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

  protected readonly _resourceTemplate: ResourceTemplate | null;

  protected readonly _mcpServer: McpServer;

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
    this._resourceTemplate = props.resourceTemplate ?? null;
    this._mcpServer = props.mcpServer ?? ({} as McpServer);
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

  toResource(): Resource | ResourceTemplate {
    return this._resourceTemplate ?? this._resource;
  }

  apply(): ResourceRegistration {
    const { name, uri, ...baseConfig } = this._resource;
    void uri;
    const config = baseConfig as Parameters<McpServer["registerResource"]>[2];
    const resolvedName = name.length > 0 ? name : this.methodName;
    if (this._resourceTemplate != null) {
      const callback: ReadResourceTemplateCallback = async (
        resourceUri: URL,
        variables: Variables,
        ctx: ServerContext,
      ): Promise<ReadResourceResult> => {
        const request: ReadResourceRequest = {
          params: {
            uri: resourceUri.toString(),
            ...(ctx.mcpReq._meta == null ? {} : { _meta: ctx.mcpReq._meta }),
          },
        } as ReadResourceRequest;
        const exchange = new McpServerExchange(this._mcpServer, ctx);
        return this.handle(exchange, request, variables);
      };

      return [
        resolvedName,
        this._resourceTemplate,
        config,
        callback,
      ] as TemplateResourceRegistration;
    }

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

    return [
      resolvedName,
      this._resource.uri,
      config,
      callback,
    ] as StaticResourceRegistration;
  }

  async handle(
    exchange: McpServerExchange,
    request: ReadResourceRequest,
    uriVariables?: Record<string, string> | Variables,
  ): Promise<ReadResourceResult> {
    assert(request != null, "Request must not be null");

    try {
      const args = this.buildArgs(exchange, request, uriVariables);
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
    exchange: McpServerExchange,
    request: ReadResourceRequest,
    uriVariables?: Record<string, string> | Variables,
  ): McpResourceMethodArguments {
    const resolvedUriVariables = this.normalizeUriVariables(uriVariables ?? {});
    return {
      exchange,
      context: this.resolveTransportContext(exchange),
      request,
      resource: this._resource,
      uri: request.params.uri,
      uriVariables: resolvedUriVariables,
      meta: new McpMeta(
        (request.params._meta as Record<string, unknown> | undefined) ?? null,
      ),
      progressToken: request.params._meta?.progressToken ?? null,
    };
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
    exchange: McpServerExchange,
  ): McpTransportContext | null {
    return exchange.transportContext();
  }

  protected normalizeUriVariables(
    uriVariables: Record<string, string> | Variables,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(uriVariables)) {
      if (value == null) {
        continue;
      }
      result[key] = Array.isArray(value)
        ? String(value[0] ?? "")
        : String(value);
    }
    return result;
  }
}
