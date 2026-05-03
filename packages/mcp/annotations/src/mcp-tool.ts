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
import { DefaultMetaProvider } from "./context/index.js";
import type { MetaProvider } from "./context/index.js";
import { MCP_TOOL_METADATA_KEY } from "./metadata.js";
import type { McpToolMethodArguments } from "./method/tool/mcp-tool-method-arguments.js";

/**
 * Additional properties describing a Tool to clients.
 *
 * all properties in ToolAnnotations are hints. They are not guaranteed to provide a
 * faithful description of tool behavior (including descriptive properties like
 * title).
 *
 * Clients should never make tool use decisions based on ToolAnnotations received from
 * untrusted servers.
 */
export interface McpToolAnnotationsOptions {
  /**
   * A human-readable title for the tool.
   */
  title?: string;

  /**
   * If true, the tool does not modify its environment.
   */
  readOnlyHint?: boolean;

  /**
   * If true, the tool may perform destructive updates to its environment. If false,
   * the tool performs only additive updates.
   *
   * (This property is meaningful only when readOnlyHint == false)
   */
  destructiveHint?: boolean;

  /**
   * If true, calling the tool repeatedly with the same arguments will have no
   * additional effect on the its environment.
   *
   * (This property is meaningful only when readOnlyHint == false)
   */
  idempotentHint?: boolean;

  /**
   * If true, this tool may interact with an "open world" of external entities. If
   * false, the tool's domain of interaction is closed. For example, the world of a
   * web search tool is open, whereas that of a memory tool is not.
   */
  openWorldHint?: boolean;
}

export interface McpToolOptions {
  /**
   * The name of the tool. If not provided, the method name will be used.
   */
  name?: string;

  /**
   * The description of the tool. If not provided, the method name will be used.
   */
  description?: string;

  /**
   * Additional hints for clients.
   */
  annotations?: McpToolAnnotationsOptions;

  /**
   * If true, the tool will generate an output schema for non-primitive output types. If
   * false, the tool will not automatically generate an output schema.
   */
  generateOutputSchema?: boolean;

  /**
   * Intended for UI and end-user contexts — optimized to be human-readable and easily
   * understood, even by those unfamiliar with domain-specific terminology. If not
   * provided, the name should be used for display (except for Tool, where
   * annotations.title should be given precedence over using name, if present).
   */
  title?: string;

  /**
   * "_meta" field for the tool declaration. If not provided, no "_meta" appended to the
   * tool specification.
   */
  metaProvider?: new () => MetaProvider;
}

export interface McpToolAnnotationsMetadata {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface McpToolMetadata {
  name: string;
  description: string;
  annotations: McpToolAnnotationsMetadata;
  generateOutputSchema: boolean;
  title: string;
  metaProvider: new () => MetaProvider;
}

const DEFAULT_TOOL_ANNOTATIONS: McpToolAnnotationsMetadata = {
  title: "",
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

type ExactToolMethodSignature<
  T extends (...args: any[]) => any,
  Signature extends (...args: any[]) => any,
> = T extends Signature
  ? Parameters<T> extends Parameters<Signature>
    ? T
    : never
  : never;

type McpToolMethodDecoratorFor = <T extends (...args: any[]) => any>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<
    ExactToolMethodSignature<
      T,
      (args: McpToolMethodArguments) => unknown | Promise<unknown>
    >
  >,
) => void;

export function McpTool(options?: McpToolOptions): McpToolMethodDecoratorFor;
export function McpTool(options: McpToolOptions = {}): MethodDecorator {
  const metadata: McpToolMetadata = {
    name: options.name ?? "",
    description: options.description ?? "",
    annotations: { ...DEFAULT_TOOL_ANNOTATIONS, ...options.annotations },
    generateOutputSchema: options.generateOutputSchema ?? false,
    title: options.title ?? "",
    metaProvider: options.metaProvider ?? DefaultMetaProvider,
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_TOOL_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
