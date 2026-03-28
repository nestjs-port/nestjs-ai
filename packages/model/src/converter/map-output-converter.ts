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

import type { StructuredOutputConverter } from "./structured-output-converter";

export class MapOutputConverter
  implements StructuredOutputConverter<Record<string, unknown>>
{
  get format(): string {
    return `Your response should be in JSON format.
The data structure for the JSON should be an object with string keys.
Do not include any explanations, only provide a RFC8259 compliant JSON response following this format without deviation.
Remove the \`\`\`json markdown surrounding the output including the trailing "\`\`\`".`;
  }

  convert(source: string): Record<string, unknown> {
    const normalized = this.normalize(source);
    const parsed = JSON.parse(normalized) as unknown;

    if (parsed === null) {
      return {};
    }
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new TypeError("JSON output must be an object");
  }

  private normalize(source: string): string {
    const trimmed = source.trim();
    if (trimmed.startsWith("```json") && trimmed.endsWith("```")) {
      return trimmed.slice(7, -3).trim();
    }
    return trimmed;
  }
}
