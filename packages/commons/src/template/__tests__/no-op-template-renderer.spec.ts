import { describe, expect, it } from "vitest";
import { NoOpTemplateRenderer } from "../no-op-template-renderer";

describe("NoOpTemplateRenderer", () => {
  it("should return unchanged template", () => {
    const renderer = new NoOpTemplateRenderer();
    const variables: Record<string, unknown> = {
      name: "Spring AI",
    };

    const result = renderer.apply("Hello {name}!", variables);

    expect(result).toBe("Hello {name}!");
  });

  it("should return unchanged template with multiple variables", () => {
    const renderer = new NoOpTemplateRenderer();
    const variables: Record<string, unknown> = {
      greeting: "Hello",
      name: "Spring AI",
      punctuation: "!",
    };

    const result = renderer.apply("{greeting} {name}{punctuation}", variables);

    expect(result).toBe("{greeting} {name}{punctuation}");
  });

  it("should not accept empty template", () => {
    const renderer = new NoOpTemplateRenderer();
    const variables: Record<string, unknown> = {};

    expect(() => renderer.apply("", variables)).toThrow(
      "template cannot be null or empty",
    );
  });

  it("should not accept null template", () => {
    const renderer = new NoOpTemplateRenderer();
    const variables: Record<string, unknown> = {};

    expect(() => renderer.apply(null as unknown as string, variables)).toThrow(
      "template cannot be null or empty",
    );
  });

  it("should not accept null variables", () => {
    const renderer = new NoOpTemplateRenderer();
    const template = "Hello!";

    expect(() =>
      renderer.apply(template, null as unknown as Record<string, unknown>),
    ).toThrow("variables cannot be null");
  });

  it("should handle variables with string keys", () => {
    const renderer = new NoOpTemplateRenderer();
    const template = "Hello!";
    // In JavaScript, object keys are always strings (null keys become "null")
    // This test verifies normal operation with string keys
    const variables: Record<string, unknown> = {
      key: "Spring AI",
    };

    const result = renderer.apply(template, variables);
    expect(result).toBe(template);
  });

  it("should return unchanged complex template", () => {
    const renderer = new NoOpTemplateRenderer();
    const variables: Record<string, unknown> = {
      header: "Welcome",
      user: "Spring AI",
      items: "one, two, three",
      footer: "Goodbye",
    };

    const template = `{header}
User: {user}
Items: {items}
{footer}
`;

    const result = renderer.apply(template, variables);

    expect(result).toBe(template);
  });
});
