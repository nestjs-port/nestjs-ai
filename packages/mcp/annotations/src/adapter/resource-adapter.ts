import type {
  Resource,
  ResourceTemplateType,
} from "@modelcontextprotocol/server";
import { MetaUtils } from "../common/meta-utils.js";
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
