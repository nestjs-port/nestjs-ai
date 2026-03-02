import { DefaultToolMetadata } from "./default-tool-metadata";

/**
 * Props for creating a {@link ToolMetadata} instance.
 */
export interface ToolMetadataProps {
  /**
   * Whether the tool result should be returned directly or passed back to the model.
   */
  returnDirect?: boolean;
}

/**
 * Metadata about a tool specification and execution.
 */
export interface ToolMetadata {
  /**
   * Whether the tool result should be returned directly or passed back to the model.
   */
  readonly returnDirect: boolean;
}

/**
 * Static methods for ToolMetadata.
 */
export namespace ToolMetadata {
  /**
   * Create a default {@link ToolMetadata} instance.
   */
  export function create(props: ToolMetadataProps = {}): ToolMetadata {
    return new DefaultToolMetadata(props.returnDirect ?? false);
  }
}
