import "reflect-metadata";
import assert from "node:assert/strict";
import { ParsingUtils } from "@nestjs-ai/commons";
import {
	TOOL_METADATA_KEY,
	type ToolAnnotationMetadata,
} from "../annotation/tool.decorator";
import type { ToolCallResultConverter } from "../execution";
import { DefaultToolCallResultConverter } from "../execution";
import type { ToolCallback } from "../tool-callback";

/**
 * Miscellaneous tool utility methods. Mainly for internal use within the framework.
 */
export abstract class ToolUtils {
	/**
	 * Regular expression pattern for recommended tool names. Tool names should contain
	 * only alphanumeric characters, underscores, hyphens, and dots for maximum
	 * compatibility across different LLMs.
	 */
	private static readonly RECOMMENDED_NAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

	private constructor() {
		// Utility class - prevent instantiation
	}

	static getToolName(target: object, propertyKey: string | symbol): string {
		assert(target, "target cannot be null");
		assert(propertyKey, "propertyKey cannot be null");

		const tool = Reflect.getMetadata(TOOL_METADATA_KEY, target, propertyKey) as
			| ToolAnnotationMetadata
			| undefined;
		const methodName =
			typeof propertyKey === "string" ? propertyKey : String(propertyKey);
		const toolName =
			tool?.name && tool.name.trim() !== "" ? tool.name : methodName;
		ToolUtils.validateToolName(toolName);
		return toolName;
	}

	static getToolDescriptionFromName(toolName: string): string {
		assert(
			toolName && toolName.trim() !== "",
			"toolName cannot be null or empty",
		);
		return ParsingUtils.reConcatenateCamelCase(toolName, " ");
	}

	static getToolDescription(
		target: object,
		propertyKey: string | symbol,
	): string {
		assert(target, "target cannot be null");
		assert(propertyKey, "propertyKey cannot be null");

		const tool = Reflect.getMetadata(TOOL_METADATA_KEY, target, propertyKey) as
			| ToolAnnotationMetadata
			| undefined;
		const methodName =
			typeof propertyKey === "string" ? propertyKey : String(propertyKey);

		if (tool == null) {
			return ParsingUtils.reConcatenateCamelCase(methodName, " ");
		}

		return tool.description && tool.description.trim() !== ""
			? tool.description
			: methodName;
	}

	static getToolReturnDirect(
		target: object,
		propertyKey: string | symbol,
	): boolean {
		assert(target, "target cannot be null");
		assert(propertyKey, "propertyKey cannot be null");

		const tool = Reflect.getMetadata(TOOL_METADATA_KEY, target, propertyKey) as
			| ToolAnnotationMetadata
			| undefined;
		return tool != null && tool.returnDirect === true;
	}

	static getToolCallResultConverter(
		target: object,
		propertyKey: string | symbol,
	): ToolCallResultConverter {
		assert(target, "target cannot be null");
		assert(propertyKey, "propertyKey cannot be null");

		const tool = Reflect.getMetadata(TOOL_METADATA_KEY, target, propertyKey) as
			| ToolAnnotationMetadata
			| undefined;
		if (tool == null) {
			return new DefaultToolCallResultConverter();
		}

		const type = tool.resultConverter;
		if (type == null) {
			return new DefaultToolCallResultConverter();
		}

		try {
			return new type();
		} catch (e) {
			throw new Error(
				`Failed to instantiate ToolCallResultConverter: ${type.name}. ${e instanceof Error ? e.message : String(e)}`,
			);
		}
	}

	static getDuplicateToolNames(toolCallbacks: ToolCallback[]): string[] {
		assert(toolCallbacks, "toolCallbacks cannot be null");

		const nameCounts = new Map<string, number>();
		for (const toolCallback of toolCallbacks) {
			const name = toolCallback.getToolDefinition().name;
			nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
		}

		const duplicates: string[] = [];
		for (const [name, count] of nameCounts.entries()) {
			if (count > 1) {
				duplicates.push(name);
			}
		}

		return duplicates;
	}

	static getDuplicateToolNamesVarArgs(
		...toolCallbacks: ToolCallback[]
	): string[] {
		assert(toolCallbacks, "toolCallbacks cannot be null");
		return ToolUtils.getDuplicateToolNames(toolCallbacks);
	}

	/**
	 * Validates that a tool name follows recommended naming conventions. Logs a warning
	 * if the tool name contains characters that may not be compatible with some LLMs.
	 * @param toolName - The tool name to validate
	 */
	private static validateToolName(toolName: string): void {
		assert(
			toolName && toolName.trim() !== "",
			"Tool name cannot be null or empty",
		);
		if (!ToolUtils.RECOMMENDED_NAME_PATTERN.test(toolName)) {
			console.warn(
				`Tool name '${toolName}' may not be compatible with some LLMs (e.g., OpenAI). ` +
					"Consider using only alphanumeric characters, underscores, hyphens, and dots.",
			);
		}
	}
}
