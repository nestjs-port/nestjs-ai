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
import type { Role } from "@modelcontextprotocol/sdk/types.js";
import { DefaultMetaProvider } from "./context/index.js";
import type { MetaProvider } from "./context/index.js";
import { MCP_RESOURCE_METADATA_KEY } from "./metadata.js";

export interface McpResourceAnnotationsOptions {
  /**
   * Describes who the intended customer of this object or data is. It can include
   * multiple entries to indicate content useful for multiple audiences (e.g.,
   * ["user", "assistant"]).
   */
  audience: Role[];

  /**
   * The date and time (in ISO 8601 format) when the resource was last modified.
   */
  lastModified?: string;

  /**
   * Describes how important this data is for operating the server.
   *
   * A value of 1 means "most important," and indicates that the data is effectively
   * required, while 0 means "least important," and indicates that the data is
   * entirely optional.
   */
  priority: number;
}

export interface McpResourceOptions {
  /**
   * Intended for programmatic or logical use, but used as a display name in past specs
   * or fallback (if title isn't present).
   */
  name?: string;

  /**
   * Optional human-readable name of the prompt for display purposes.
   */
  title?: string;

  /**
   * the URI of the resource.
   */
  uri?: string;

  /**
   * A description of what this resource represents. This can be used by clients to
   * improve the LLM's understanding of available resources. It can be thought of like a
   * "hint" to the model.
   */
  description?: string;

  /**
   * The MIME type of this resource, if known.
   */
  mimeType?: string;

  /**
   * Optional annotations for the client. If omitted, no annotations are emitted.
   */
  annotations?: McpResourceAnnotationsOptions;

  /**
   * Optional meta provider class that supplies data for "_meta" field for this resource
   * declaration. Defaults to {@link DefaultMetaProvider} implementation.
   */
  metaProvider?: new () => MetaProvider;
}

export interface McpResourceAnnotationsMetadata {
  audience: Role[];
  lastModified: string;
  priority: number;
}

export interface McpResourceMetadata {
  name: string;
  title: string;
  uri: string;
  description: string;
  mimeType: string;
  annotations: McpResourceAnnotationsMetadata | null;
  metaProvider: new () => MetaProvider;
}

/**
 * Marks a method as a MCP Resource.
 */
export function McpResource(options: McpResourceOptions = {}): MethodDecorator {
  const annotations: McpResourceAnnotationsMetadata | null = options.annotations
    ? {
        audience: [...options.annotations.audience],
        lastModified: options.annotations.lastModified ?? "",
        priority: options.annotations.priority,
      }
    : null;

  const metadata: McpResourceMetadata = {
    name: options.name ?? "",
    title: options.title ?? "",
    uri: options.uri ?? "",
    description: options.description ?? "",
    mimeType: options.mimeType ?? "text/plain",
    annotations,
    metaProvider: options.metaProvider ?? DefaultMetaProvider,
  };

  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: PropertyDescriptor,
  ): void => {
    Reflect.defineMetadata(
      MCP_RESOURCE_METADATA_KEY,
      metadata,
      target,
      propertyKey,
    );
  };
}
