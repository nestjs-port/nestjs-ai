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

import type {
  ClientCapabilities,
  CreateMessageRequest,
  CreateMessageResult,
  ElicitRequest,
  ElicitResult,
  Implementation,
  ListRootsResult,
  LoggingMessageNotification,
  ProgressNotification,
  McpServer,
  ServerContext,
} from "@modelcontextprotocol/server";

import { McpTransportContext } from "./mcp-transport-context.js";

/**
 * Server-side exchange that abstracts the per-request capabilities surfaced by an
 * MCP server.
 *
 * This mirrors the Java `McpAsyncServerExchange` shape, but is backed by the v2
 * `Server` and `ServerContext` objects.
 */
export class McpServerExchange {
  private readonly _sessionId: string | undefined;

  private readonly _clientCapabilities: ClientCapabilities | undefined;

  private readonly _clientInfo: Implementation | undefined;

  private readonly _transportContext: McpTransportContext;

  constructor(
    public readonly mcpServer: McpServer,
    public readonly serverContext: ServerContext,
    transportContext: McpTransportContext = McpTransportContext.EMPTY,
  ) {
    this._sessionId = serverContext.sessionId;
    this._clientCapabilities = mcpServer.server.getClientCapabilities();
    this._clientInfo = mcpServer.server.getClientVersion();
    this._transportContext = transportContext;
  }

  getClientCapabilities(): ClientCapabilities | undefined {
    return this._clientCapabilities;
  }

  getClientInfo(): Implementation | undefined {
    return this._clientInfo;
  }

  sessionId(): string | undefined {
    return this._sessionId;
  }

  transportContext(): McpTransportContext {
    return this._transportContext;
  }

  listRoots(): Promise<ListRootsResult> {
    return this.mcpServer.server.listRoots();
  }

  createElicitation(request: ElicitRequest): Promise<ElicitResult> {
    return this.mcpServer.server.elicitInput(request.params);
  }

  createMessage(request: CreateMessageRequest): Promise<CreateMessageResult> {
    return this.mcpServer.server.createMessage(request.params);
  }

  progressNotification(notification: ProgressNotification): Promise<void> {
    return this.serverContext.mcpReq.notify(notification);
  }

  loggingNotification(notification: LoggingMessageNotification): Promise<void> {
    return this.mcpServer.server.sendLoggingMessage(
      notification.params,
      this.sessionId(),
    );
  }

  ping(): Promise<unknown> {
    return this.mcpServer.server.ping();
  }
}
