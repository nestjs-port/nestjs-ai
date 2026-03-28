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
