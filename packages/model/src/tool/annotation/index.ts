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

export {
  TOOL_METADATA_KEY,
  Tool,
  type ToolAnnotationMetadata,
  type ToolInputOnlyAnnotationMetadata,
  type ToolReturnsOnlyAnnotationMetadata,
  type ToolSchemaAnnotationMetadata,
  type ToolSchemaLessAnnotationMetadata,
} from "./tool.decorator.js";
export {
  TOOL_V2_METADATA_KEY,
  ToolV2,
  type ToolV2AnnotationMetadata,
  type ToolV2InputOnlyAnnotationMetadata,
  type ToolV2ReturnsOnlyAnnotationMetadata,
  type ToolV2SchemaAnnotationMetadata,
  type ToolV2SchemaLessAnnotationMetadata,
} from "./tool-v2.decorator.js";
