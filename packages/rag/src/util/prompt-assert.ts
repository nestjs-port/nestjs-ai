import assert from "node:assert/strict";
import type { PromptTemplate } from "@nestjs-ai/model";

export class PromptAssert {
  private constructor() {
    // Utility class
  }

  static templateHasRequiredPlaceholders(
    promptTemplate: PromptTemplate,
    ...placeholders: string[]
  ): void {
    assert(promptTemplate != null, "promptTemplate cannot be null");
    assert(placeholders.length > 0, "placeholders cannot be null or empty");

    const missingPlaceholders: string[] = [];
    for (const placeholder of placeholders) {
      if (!promptTemplate.template.includes(placeholder)) {
        missingPlaceholders.push(placeholder);
      }
    }

    if (missingPlaceholders.length > 0) {
      throw new Error(
        `The following placeholders must be present in the prompt template: ${missingPlaceholders.join(",")}`,
      );
    }
  }
}
