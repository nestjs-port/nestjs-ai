import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { Tool } from "../../annotation";
import { ToolUtils } from "../tool-utils";

/**
 * Unit tests for ToolUtils.
 */
describe("ToolUtilsTests", () => {
	// Test helper class with various tool methods
	class TestTools {
		simpleMethod() {
			// Method without @Tool annotation
		}

		@Tool()
		annotatedMethodWithoutName() {
			// Method with @Tool but no name specified
		}

		@Tool({ name: "valid_tool-name.v1" })
		methodWithValidName() {
			// Method with valid tool name
		}

		@Tool({ name: "invalid tool name" })
		methodWithSpacesInName() {
			// Method with spaces in tool name (invalid)
		}

		@Tool({ name: "tool@name!" })
		methodWithSpecialCharsInName() {
			// Method with special characters in tool name (invalid)
		}

		@Tool({ name: "tool()" })
		methodWithParenthesesInName() {
			// Method with parentheses in tool name (invalid)
		}

		@Tool({ name: "" })
		methodWithEmptyName() {
			// Method with empty name (falls back to method name)
		}

		@Tool({ description: "This is a tool description" })
		methodWithDescription() {
			// Method with description
		}

		@Tool({ name: "获取天气" })
		methodWithUnicodeName() {
			// Method with unicode characters in tool name (Chinese: "get weather")
		}
	}

	it("get tool name from method without annotation", () => {
		const toolName = ToolUtils.getToolName(TestTools.prototype, "simpleMethod");
		expect(toolName).toBe("simpleMethod");
	});

	it("get tool name from method with annotation but no name", () => {
		const toolName = ToolUtils.getToolName(
			TestTools.prototype,
			"annotatedMethodWithoutName",
		);
		expect(toolName).toBe("annotatedMethodWithoutName");
	});

	it("get tool name from method with valid name", () => {
		const toolName = ToolUtils.getToolName(
			TestTools.prototype,
			"methodWithValidName",
		);
		expect(toolName).toBe("valid_tool-name.v1");
	});

	it("get tool name from method with name containing spaces", () => {
		// Tool names with spaces are now allowed but will generate a warning log
		const toolName = ToolUtils.getToolName(
			TestTools.prototype,
			"methodWithSpacesInName",
		);
		expect(toolName).toBe("invalid tool name");
	});

	it("get tool name from method with name containing special chars", () => {
		// Tool names with special characters are now allowed but will generate a warning
		// log
		const toolName = ToolUtils.getToolName(
			TestTools.prototype,
			"methodWithSpecialCharsInName",
		);
		expect(toolName).toBe("tool@name!");
	});

	it("get tool name from method with name containing parentheses", () => {
		// Tool names with parentheses are now allowed but will generate a warning log
		const toolName = ToolUtils.getToolName(
			TestTools.prototype,
			"methodWithParenthesesInName",
		);
		expect(toolName).toBe("tool()");
	});

	it("get tool name from method with empty name", () => {
		// When name is empty, it falls back to method name which is valid
		const toolName = ToolUtils.getToolName(
			TestTools.prototype,
			"methodWithEmptyName",
		);
		expect(toolName).toBe("methodWithEmptyName");
	});

	it("get tool description from method without annotation", () => {
		const description = ToolUtils.getToolDescription(
			TestTools.prototype,
			"simpleMethod",
		);
		expect(description).toBe("simple method");
	});

	it("get tool description from method with annotation but no description", () => {
		const description = ToolUtils.getToolDescription(
			TestTools.prototype,
			"annotatedMethodWithoutName",
		);
		expect(description).toBe("annotatedMethodWithoutName");
	});

	it("get tool description from method with description", () => {
		const description = ToolUtils.getToolDescription(
			TestTools.prototype,
			"methodWithDescription",
		);
		expect(description).toBe("This is a tool description");
	});

	it("get tool name from method with unicode characters", () => {
		// Tool names with unicode characters should be allowed for non-English contexts
		const toolName = ToolUtils.getToolName(
			TestTools.prototype,
			"methodWithUnicodeName",
		);
		expect(toolName).toBe("获取天气");
	});
});
