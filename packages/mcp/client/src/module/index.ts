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

export { McpClientAnnotationRegistrar } from "./mcp-client-annotation-registrar.js";
export {
  type McpClientConnectionSpec,
  type McpClientAnnotationScannerOptions,
  type McpClientModuleAsyncOptions,
  type McpClientModuleOptions,
  type McpClientRegistration,
  type McpClientStdioConnectionOptions,
  type McpClientStdioOptions,
  type McpClientStreamableHttpConnectionOptions,
  type McpClientStreamableHttpOptions,
  normalizeMcpClientConnectionSpecs,
  createMcpClientTransport,
} from "./mcp-client-module.options.js";
export { McpClientModule } from "./mcp-client.module.js";
export { MCP_CLIENT_REGISTRATIONS_TOKEN } from "./mcp-client.tokens.js";
