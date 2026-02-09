import type { TemplateRenderer } from "@nestjs-ai/commons";
import { NoOpTemplateRenderer } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { SystemMessage } from "../../messages";
import { SystemPromptTemplate } from "../system-prompt-template";

class CustomTestRenderer implements TemplateRenderer {
	apply(template: string, _variables: Record<string, unknown | null>): string {
		return `${template} (Rendered by Custom)`;
	}
}

describe("SystemPromptTemplate", () => {
	it("create with valid template", () => {
		const template = "Hello {name}!";
		const systemPromptTemplate = new SystemPromptTemplate(template);
		expect(systemPromptTemplate.template).toBe(template);
	});

	it("create with empty template", () => {
		expect(() => new SystemPromptTemplate("")).toThrow(
			"template cannot be null or empty",
		);
	});

	it("create with null template", () => {
		expect(() => new SystemPromptTemplate(null as unknown as string)).toThrow(
			"template cannot be null or empty",
		);
	});

	it("create with valid resource", () => {
		const content = "Hello {name}!";
		const resource = Buffer.from(content);
		const systemPromptTemplate = new SystemPromptTemplate(resource);
		expect(systemPromptTemplate.template).toBe(content);
	});

	it("create with null resource", () => {
		expect(() => new SystemPromptTemplate(null as unknown as Buffer)).toThrow();
	});

	it("create with null variables", () => {
		expect(() =>
			SystemPromptTemplate.builder()
				.template("Hello!")
				.variables(null as unknown as Record<string, unknown>)
				.build(),
		).toThrow("variables cannot be null");
	});

	it("add variable", () => {
		const systemPromptTemplate = new SystemPromptTemplate("Hello {name}!");
		systemPromptTemplate.add("name", "Spring AI");
		expect(systemPromptTemplate.render()).toBe("Hello Spring AI!");
	});

	it("render without variables", () => {
		const systemPromptTemplate = new SystemPromptTemplate("Hello!");
		expect(systemPromptTemplate.render()).toBe("Hello!");
	});

	it("render with variables", () => {
		const variables: Record<string, unknown> = { name: "Spring AI" };
		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template("Hello {name}!")
			.variables(variables)
			.build();
		expect(systemPromptTemplate.render()).toBe("Hello Spring AI!");
	});

	it("render with additional variables", () => {
		const variables: Record<string, unknown> = { greeting: "Hello" };
		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template("{greeting} {name}!")
			.variables(variables)
			.build();

		const additionalVariables: Record<string, unknown> = {
			name: "Spring AI",
		};
		expect(systemPromptTemplate.render(additionalVariables)).toBe(
			"Hello Spring AI!",
		);
	});

	it("render with resource variable", () => {
		const resourceContent = "Spring AI";
		const resource = Buffer.from(resourceContent);
		const variables: Record<string, unknown> = { content: resource };

		const systemPromptTemplate = new SystemPromptTemplate("Hello {content}!");
		expect(systemPromptTemplate.render(variables)).toBe("Hello Spring AI!");
	});

	it("create message without variables", () => {
		const systemPromptTemplate = new SystemPromptTemplate("Hello!");
		const message = systemPromptTemplate.createMessage();
		expect(message).toBeInstanceOf(SystemMessage);
		expect(message.text).toBe("Hello!");
	});

	it("create message with variables", () => {
		const variables: Record<string, unknown> = { name: "Spring AI" };
		const systemPromptTemplate = new SystemPromptTemplate("Hello {name}!");
		const message = systemPromptTemplate.createMessage(variables);
		expect(message).toBeInstanceOf(SystemMessage);
		expect(message.text).toBe("Hello Spring AI!");
	});

	it("create prompt without variables", () => {
		const systemPromptTemplate = new SystemPromptTemplate("Hello!");
		const prompt = systemPromptTemplate.create();
		expect(prompt.contents).toBe("Hello!");
	});

	it("create prompt with variables", () => {
		const variables: Record<string, unknown> = { name: "Spring AI" };
		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template("Hello {name}!")
			.variables(variables)
			.build();
		const prompt = systemPromptTemplate.create(variables);
		expect(prompt.contents).toBe("Hello Spring AI!");
	});

	it("create with custom renderer", () => {
		const customRenderer = new NoOpTemplateRenderer();
		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template("Hello {name}!")
			.renderer(customRenderer)
			.build();
		expect(systemPromptTemplate.render()).toBe("Hello {name}!");
	});

	it("builder should not allow both template and resource", () => {
		const template = "Hello!";
		const resource = Buffer.from(template);

		expect(() =>
			SystemPromptTemplate.builder()
				.template(template)
				.resource(resource)
				.build(),
		).toThrow("Only one of template or resource can be set");
	});

	// --- Builder Pattern Tests ---

	it("create with valid template (builder)", () => {
		const template = "Hello {name}!";
		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template(template)
			.build();
		expect(systemPromptTemplate.render({ name: "Test" })).toBe("Hello Test!");
	});

	it("render with variables (builder)", () => {
		const variables: Record<string, unknown> = { name: "Spring AI" };
		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template("Hello {name}!")
			.variables(variables)
			.build();
		expect(systemPromptTemplate.render()).toBe("Hello Spring AI!");
	});

	it("create with valid resource (builder)", () => {
		const content = "Hello {name}!";
		const resource = Buffer.from(content);
		const systemPromptTemplate = SystemPromptTemplate.builder()
			.resource(resource)
			.build();
		expect(systemPromptTemplate.render({ name: "Resource" })).toBe(
			"Hello Resource!",
		);
	});

	it("add variable (builder)", () => {
		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template("Hello {name}!")
			.variables({ name: "Spring AI" })
			.build();
		expect(systemPromptTemplate.render()).toBe("Hello Spring AI!");
	});

	it("render without variables (builder)", () => {
		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template("Hello!")
			.build();
		expect(systemPromptTemplate.render()).toBe("Hello!");
	});

	it("render with additional variables (builder)", () => {
		const variables: Record<string, unknown> = { greeting: "Hello" };
		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template("{greeting} {name}!")
			.variables(variables)
			.build();

		const additionalVariables: Record<string, unknown> = {
			name: "Spring AI",
		};
		expect(systemPromptTemplate.render(additionalVariables)).toBe(
			"Hello Spring AI!",
		);
	});

	it("render with resource variable (builder)", () => {
		const resourceContent = "Spring AI";
		const resource = Buffer.from(resourceContent);
		const variables: Record<string, unknown> = { content: resource };

		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template("Hello {content}!")
			.variables(variables)
			.build();
		expect(systemPromptTemplate.render()).toBe("Hello Spring AI!");
	});

	it("variables overwriting (builder)", () => {
		const initialVars = { name: "Initial", adj: "Good" };
		const overwriteVars = { name: "Overwritten", noun: "Day" };

		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template("Hello {name} {noun}!")
			.variables(initialVars)
			.variables(overwriteVars)
			.build();

		expect(systemPromptTemplate.render()).toBe("Hello Overwritten Day!");
	});

	it("custom renderer (builder)", () => {
		const template = "This is a test.";
		const customRenderer = new CustomTestRenderer();

		const systemPromptTemplate = SystemPromptTemplate.builder()
			.template(template)
			.renderer(customRenderer)
			.build();

		expect(systemPromptTemplate.render()).toBe(
			`${template} (Rendered by Custom)`,
		);
	});

	it("resource (builder)", () => {
		const templateContent = "Hello {name} from Resource!";
		const templateResource = Buffer.from(templateContent);
		const vars = { name: "Builder" };

		const systemPromptTemplate = SystemPromptTemplate.builder()
			.resource(templateResource)
			.variables(vars)
			.build();

		expect(systemPromptTemplate.render()).toBe("Hello Builder from Resource!");
	});
});
