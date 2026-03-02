import { describe, expect, it } from "vitest";
import { ToolUtils } from "../tool-utils";

describe("ToolUtils", () => {
  it("resolves tool name from metadata with fallback to method name", () => {
    expect(ToolUtils.getToolName("simpleMethod", { name: "custom-tool" })).toBe(
      "custom-tool",
    );
    expect(ToolUtils.getToolName("simpleMethod", { name: "" })).toBe(
      "simpleMethod",
    );
  });

  it("resolves tool description from metadata with fallback behavior", () => {
    expect(
      ToolUtils.getToolDescription("simpleMethod", {
        description: "Custom description",
      }),
    ).toBe("Custom description");
    expect(
      ToolUtils.getToolDescription("simpleMethod", { description: "" }),
    ).toBe("simpleMethod");
    expect(ToolUtils.getToolDescription("simpleMethod")).toBe("simple method");
  });

  it("validates tool names with recommended characters", () => {
    expect(() =>
      ToolUtils.validateToolName("valid_tool-name.v1"),
    ).not.toThrow();
  });

  it("allows tool names with non-recommended characters", () => {
    expect(() => ToolUtils.validateToolName("invalid tool name")).not.toThrow();
    expect(() => ToolUtils.validateToolName("tool@name!")).not.toThrow();
  });

  it("rejects blank tool names", () => {
    expect(() => ToolUtils.validateToolName("")).toThrow(
      "Tool name cannot be null or empty",
    );
  });

  it("generates a human-readable description from a camelCase name", () => {
    expect(ToolUtils.getToolDescriptionFromName("simpleMethod")).toBe(
      "simple method",
    );
  });
});
