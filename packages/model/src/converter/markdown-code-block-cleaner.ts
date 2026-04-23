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

import type { ResponseTextCleaner } from "./response-text-cleaner.js";

export class MarkdownCodeBlockCleaner implements ResponseTextCleaner {
  clean(text: string | null): string | null {
    if (text == null || text.length === 0) {
      return text;
    }

    let result = text.trim();

    if (result.startsWith("```") && result.endsWith("```")) {
      const firstNewline = result.indexOf("\n");
      const firstLine =
        firstNewline >= 0
          ? result.slice(0, firstNewline).trim()
          : result.trim();
      if (firstLine.toLowerCase().startsWith("```")) {
        if (firstLine.length > 3) {
          result = firstNewline >= 0 ? result.slice(firstNewline + 1) : "";
        } else {
          result = result.substring(3);
        }
      } else {
        result = result.substring(3);
      }

      if (result.endsWith("```")) {
        result = result.substring(0, result.length - 3);
      }
      result = result.trim();
    }

    return result;
  }
}
