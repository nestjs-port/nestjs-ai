import type { ToolMetadata } from "./tool-metadata";

/**
 * Default implementation of {@link ToolMetadata}.
 */
export class DefaultToolMetadata implements ToolMetadata {
  readonly returnDirect: boolean;

  constructor(returnDirect = false) {
    this.returnDirect = returnDirect;
  }
}
