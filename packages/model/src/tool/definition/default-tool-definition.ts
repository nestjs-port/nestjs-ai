import { ParsingUtils } from "@nestjs-ai/commons";
import type { ToolDefinition } from "./tool-definition";

/**
 * Default implementation of {@link ToolDefinition}.
 */
export class DefaultToolDefinition implements ToolDefinition {
	readonly name: string;
	readonly description: string;
	readonly inputSchema: string;

	constructor(name: string, description: string, inputSchema: string) {
		if (!name || name.trim() === "") {
			throw new Error("name cannot be null or empty");
		}
		if (!description || description.trim() === "") {
			throw new Error("description cannot be null or empty");
		}
		if (!inputSchema || inputSchema.trim() === "") {
			throw new Error("inputSchema cannot be null or empty");
		}

		this.name = name;
		this.description = description;
		this.inputSchema = inputSchema;
	}

	static builder(): DefaultToolDefinitionBuilder {
		return new DefaultToolDefinitionBuilder();
	}
}

/**
 * Builder for creating {@link ToolDefinition} instances.
 */
export class DefaultToolDefinitionBuilder {
	private _name: string | null = null;
	private _description: string | null = null;
	private _inputSchema: string | null = null;

	name(name: string): this {
		this._name = name;
		return this;
	}

	description(description: string): this {
		this._description = description;
		return this;
	}

	inputSchema(inputSchema: string): this {
		this._inputSchema = inputSchema;
		return this;
	}

	build(): ToolDefinition {
		if (this._name == null || this._name.trim() === "") {
			throw new Error("toolName cannot be null or empty");
		}

		let description = this._description;
		if (!description || description.trim() === "") {
			description = ParsingUtils.reConcatenateCamelCase(this._name, " ");
		}

		if (!description || description.trim() === "") {
			throw new Error("toolDescription cannot be null or empty");
		}

		if (this._inputSchema == null || this._inputSchema.trim() === "") {
			throw new Error("inputSchema cannot be null or empty");
		}

		return new DefaultToolDefinition(
			this._name,
			description,
			this._inputSchema,
		);
	}
}
