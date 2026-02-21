import { PromptTemplate } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { PromptAssert } from "../prompt-assert";

describe("PromptAssert", () => {
  it("when placeholder is present then ok", () => {
    const promptTemplate = new PromptTemplate("Hello, {name}!");

    expect(() =>
      PromptAssert.templateHasRequiredPlaceholders(promptTemplate, "{name}"),
    ).not.toThrow();
  });

  it("when placeholder is missing then throw", () => {
    const promptTemplate = new PromptTemplate("Hello, {name}!");

    expect(() =>
      PromptAssert.templateHasRequiredPlaceholders(
        promptTemplate,
        "{name}",
        "{age}",
      ),
    ).toThrow("{age}");
  });

  it("when prompt template is null then throw", () => {
    expect(() =>
      PromptAssert.templateHasRequiredPlaceholders(
        null as unknown as PromptTemplate,
        "{name}",
      ),
    ).toThrow("promptTemplate cannot be null");
  });

  it("when placeholders is null then throw", () => {
    const placeholders = null as unknown as string[];

    expect(() =>
      PromptAssert.templateHasRequiredPlaceholders(
        new PromptTemplate("{query}"),
        ...(placeholders ?? []),
      ),
    ).toThrow("placeholders cannot be null or empty");
  });

  it("when placeholders is empty then throw", () => {
    expect(() =>
      PromptAssert.templateHasRequiredPlaceholders(
        new PromptTemplate("{query}"),
      ),
    ).toThrow("placeholders cannot be null or empty");
  });
});
