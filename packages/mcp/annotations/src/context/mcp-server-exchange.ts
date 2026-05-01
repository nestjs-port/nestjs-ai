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
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Server-side exchange that abstracts the per-request capabilities surfaced by an
 * MCP server. Methods on this exchange perform out-of-band interactions with the
 * connected client (sampling, elicitation, listing roots, sending notifications,
 * pinging).
 */
export interface McpServerExchange {
  getClientCapabilities(): ClientCapabilities | undefined;

  getClientInfo(): Implementation | undefined;

  sessionId(): string | undefined;

  listRoots(): Promise<ListRootsResult>;

  createElicitation(request: ElicitRequest): Promise<ElicitResult>;

  createMessage(request: CreateMessageRequest): Promise<CreateMessageResult>;

  progressNotification(notification: ProgressNotification): Promise<void>;

  loggingNotification(notification: LoggingMessageNotification): Promise<void>;

  ping(): Promise<unknown>;
}
