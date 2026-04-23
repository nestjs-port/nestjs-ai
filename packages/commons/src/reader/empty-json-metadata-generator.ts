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

import type { JsonMetadataGenerator } from "./json-metadata-generator.js";

export class EmptyJsonMetadataGenerator implements JsonMetadataGenerator {
  private static readonly EMPTY_MAP: Record<string, unknown> = Object.freeze(
    {},
  );

  generate(_jsonMap: Record<string, unknown>): Record<string, unknown> {
    return EmptyJsonMetadataGenerator.EMPTY_MAP;
  }
}
