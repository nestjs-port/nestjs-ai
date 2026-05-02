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
  Resource,
  ResourceTemplateType,
} from "@modelcontextprotocol/server";
import { MetaUtils } from "../common/index.js";
import type { McpResourceMetadata } from "../mcp-resource.js";

/**
 * Utility class that converts `McpResource` metadata into MCP schema objects.
 */
export abstract class ResourceAdapter {
  private constructor() {}

  static asResource(mcpResourceAnnotation: McpResourceMetadata): Resource {
    let name = mcpResourceAnnotation.name;
    if (name == null || name.length === 0) {
      name = "resource"; // Default name when not specified
    }
    const meta = MetaUtils.getMeta(mcpResourceAnnotation.metaProvider);

    const resource: Resource = {
      uri: mcpResourceAnnotation.uri,
      name,
      title: mcpResourceAnnotation.title || undefined,
      description: mcpResourceAnnotation.description || undefined,
      mimeType: mcpResourceAnnotation.mimeType || undefined,
      _meta: meta ?? undefined,
    };

    const annotations = mcpResourceAnnotation.annotations;
    if (annotations) {
      resource.annotations = {
        audience: [...annotations.audience],
        lastModified: annotations.lastModified,
        priority: annotations.priority,
      };
    }

    return resource;
  }

  static asResourceTemplate(
    mcpResource: McpResourceMetadata,
  ): ResourceTemplateType {
    let name = mcpResource.name;
    if (name == null || name.length === 0) {
      name = "resource"; // Default name when not specified
    }
    const meta = MetaUtils.getMeta(mcpResource.metaProvider);

    return {
      uriTemplate: mcpResource.uri,
      name,
      description: mcpResource.description || undefined,
      mimeType: mcpResource.mimeType || undefined,
      _meta: meta ?? undefined,
    };
  }
}
