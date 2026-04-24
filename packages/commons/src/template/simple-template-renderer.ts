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

import assert from "node:assert/strict";
import type { TemplateRenderer } from "./template-renderer.interface.js";

const PLACEHOLDER_PATTERN = /\{([A-Za-z0-9_.-]+)}/g;
const VALIDATION_MESSAGE =
  "Not all variables were replaced in the template. Missing variable names are: %s.";

export class SimpleTemplateRenderer implements TemplateRenderer {
  apply(template: string, variables: Record<string, unknown | null>): string {
    assert(
      template != null && template.length > 0,
      "template cannot be null or empty",
    );
    assert(variables != null, "variables cannot be null");

    const keys = Object.keys(variables);
    for (const key of keys) {
      assert(key != null, "variables keys cannot be null");
    }

    const missingVariables = this.getMissingVariables(template, variables);
    if (missingVariables.size > 0) {
      const missingList = Array.from(missingVariables).join(", ");
      throw new Error(VALIDATION_MESSAGE.replace("%s", missingList));
    }

    return template.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
      if (!Object.hasOwn(variables, key)) {
        return match;
      }

      const value = variables[key];
      return value == null ? "" : String(value);
    });
  }

  private getMissingVariables(
    template: string,
    variables: Record<string, unknown | null>,
  ): Set<string> {
    const templateVariables = new Set<string>();

    for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
      templateVariables.add(match[1]);
    }

    const missingVariables = new Set(templateVariables);
    for (const key of Object.keys(variables)) {
      missingVariables.delete(key);
    }

    return missingVariables;
  }
}
