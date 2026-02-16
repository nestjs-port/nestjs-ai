import type { TemplateRenderer } from "@nestjs-ai/commons";
import { NoOpTemplateRenderer } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { UserMessage } from "../../messages";
import { PromptTemplate } from "../prompt-template";

class CustomTestRenderer implements TemplateRenderer {
  apply(template: string, _variables: Record<string, unknown | null>): string {
    return `${template} (Rendered by Custom)`;
  }
}

describe("PromptTemplate", () => {
  it("create with valid template", () => {
    const template = "Hello {name}!";
    const promptTemplate = new PromptTemplate(template);
    expect(promptTemplate.template).toBe(template);
  });

  it("create with empty template", () => {
    expect(() => new PromptTemplate("")).toThrow(
      "template cannot be null or empty",
    );
  });

  it("create with null template", () => {
    expect(() => new PromptTemplate(null as unknown as string)).toThrow(
      "template cannot be null or empty",
    );
  });

  it("create with valid resource", () => {
    const content = "Hello {name}!";
    const resource = Buffer.from(content);
    const promptTemplate = new PromptTemplate(resource);
    expect(promptTemplate.template).toBe(content);
  });

  it("create with null resource", () => {
    expect(() => new PromptTemplate(null as unknown as Buffer)).toThrow();
  });

  it("create with null variables", () => {
    expect(() =>
      PromptTemplate.builder()
        .template("Hello!")
        .variables(null as unknown as Record<string, unknown>)
        .build(),
    ).toThrow("variables cannot be null");
  });

  it("add variable", () => {
    const promptTemplate = new PromptTemplate("Hello {name}!");
    promptTemplate.add("name", "Spring AI");
    expect(promptTemplate.render()).toBe("Hello Spring AI!");
  });

  it("render without variables", () => {
    const promptTemplate = new PromptTemplate("Hello!");
    expect(promptTemplate.render()).toBe("Hello!");
  });

  it("render with variables", () => {
    const variables: Record<string, unknown> = { name: "Spring AI" };
    const promptTemplate = PromptTemplate.builder()
      .template("Hello {name}!")
      .variables(variables)
      .build();
    expect(promptTemplate.render()).toBe("Hello Spring AI!");
  });

  it("render with additional variables", () => {
    const variables: Record<string, unknown> = { greeting: "Hello" };
    const promptTemplate = PromptTemplate.builder()
      .template("{greeting} {name}!")
      .variables(variables)
      .build();

    const additionalVariables: Record<string, unknown> = {
      name: "Spring AI",
    };
    expect(promptTemplate.render(additionalVariables)).toBe("Hello Spring AI!");
  });

  it("render with resource variable", () => {
    const resourceContent = "Spring AI";
    const resource = Buffer.from(resourceContent);
    const variables: Record<string, unknown> = { content: resource };

    const promptTemplate = new PromptTemplate("Hello {content}!");
    expect(promptTemplate.render(variables)).toBe("Hello Spring AI!");
  });

  it("create message without variables", () => {
    const promptTemplate = new PromptTemplate("Hello!");
    const message = promptTemplate.createMessage();
    expect(message).toBeInstanceOf(UserMessage);
    expect(message.text).toBe("Hello!");
  });

  it("create message with variables", () => {
    const variables: Record<string, unknown> = { name: "Spring AI" };
    const promptTemplate = new PromptTemplate("Hello {name}!");
    const message = promptTemplate.createMessage(variables);
    expect(message).toBeInstanceOf(UserMessage);
    expect(message.text).toBe("Hello Spring AI!");
  });

  it("create prompt without variables", () => {
    const promptTemplate = new PromptTemplate("Hello!");
    const prompt = promptTemplate.create();
    expect(prompt.contents).toBe("Hello!");
  });

  it("create prompt with variables", () => {
    const variables: Record<string, unknown> = { name: "Spring AI" };
    const promptTemplate = PromptTemplate.builder()
      .template("Hello {name}!")
      .variables(variables)
      .build();
    const prompt = promptTemplate.create(variables);
    expect(prompt.contents).toBe("Hello Spring AI!");
  });

  it("create with custom renderer", () => {
    const customRenderer = new NoOpTemplateRenderer();
    const promptTemplate = PromptTemplate.builder()
      .template("Hello {name}!")
      .renderer(customRenderer)
      .build();
    expect(promptTemplate.render()).toBe("Hello {name}!");
  });

  it("builder should not allow both template and resource", () => {
    const template = "Hello!";
    const resource = Buffer.from(template);

    expect(() =>
      PromptTemplate.builder().template(template).resource(resource).build(),
    ).toThrow("Only one of template or resource can be set");
  });

  // --- Builder Pattern Tests ---

  it("create with valid template (builder)", () => {
    const template = "Hello {name}!";
    const promptTemplate = PromptTemplate.builder().template(template).build();
    expect(promptTemplate.render({ name: "Test" })).toBe("Hello Test!");
  });

  it("render with variables (builder)", () => {
    const variables: Record<string, unknown> = { name: "Spring AI" };
    const promptTemplate = PromptTemplate.builder()
      .template("Hello {name}!")
      .variables(variables)
      .build();
    expect(promptTemplate.render()).toBe("Hello Spring AI!");
  });

  it("create with valid resource (builder)", () => {
    const content = "Hello {name}!";
    const resource = Buffer.from(content);
    const promptTemplate = PromptTemplate.builder().resource(resource).build();
    expect(promptTemplate.render({ name: "Resource" })).toBe("Hello Resource!");
  });

  it("add variable (builder)", () => {
    const promptTemplate = PromptTemplate.builder()
      .template("Hello {name}!")
      .variables({ name: "Spring AI" })
      .build();
    expect(promptTemplate.render()).toBe("Hello Spring AI!");
  });

  it("render without variables (builder)", () => {
    const promptTemplate = PromptTemplate.builder().template("Hello!").build();
    expect(promptTemplate.render()).toBe("Hello!");
  });

  it("render with additional variables (builder)", () => {
    const variables: Record<string, unknown> = { greeting: "Hello" };
    const promptTemplate = PromptTemplate.builder()
      .template("{greeting} {name}!")
      .variables(variables)
      .build();

    const additionalVariables: Record<string, unknown> = {
      name: "Spring AI",
    };
    expect(promptTemplate.render(additionalVariables)).toBe("Hello Spring AI!");
  });

  it("render with resource variable (builder)", () => {
    const resourceContent = "Spring AI";
    const resource = Buffer.from(resourceContent);
    const variables: Record<string, unknown> = { content: resource };

    const promptTemplate = PromptTemplate.builder()
      .template("Hello {content}!")
      .variables(variables)
      .build();
    expect(promptTemplate.render()).toBe("Hello Spring AI!");
  });

  it("variables overwriting (builder)", () => {
    const initialVars = { name: "Initial", adj: "Good" };
    const overwriteVars = { name: "Overwritten", noun: "Day" };

    const promptTemplate = PromptTemplate.builder()
      .template("Hello {name} {noun}!")
      .variables(initialVars)
      .variables(overwriteVars)
      .build();

    // Expect only variables from the last call to be present
    expect(promptTemplate.render()).toBe("Hello Overwritten Day!");
  });

  it("custom renderer (builder)", () => {
    const template = "This is a test.";
    const customRenderer = new CustomTestRenderer();

    const promptTemplate = PromptTemplate.builder()
      .template(template)
      .renderer(customRenderer)
      .build();

    expect(promptTemplate.render()).toBe(`${template} (Rendered by Custom)`);
  });

  it("resource (builder)", () => {
    const templateContent = "Hello {name} from Resource!";
    const templateResource = Buffer.from(templateContent);
    const vars = { name: "Builder" };

    const promptTemplate = PromptTemplate.builder()
      .resource(templateResource)
      .variables(vars)
      .build();

    expect(promptTemplate.render()).toBe("Hello Builder from Resource!");
  });

  it("render with resource file", () => {
    const resource = Buffer.from("Hello, world!");

    const promptTemplate = PromptTemplate.builder()
      .template("How {name}")
      .variables({ name: resource })
      .build();

    expect(promptTemplate.render({})).toBe("How Hello, world!");
  });
});
