import { describe, expect, it } from "vitest";
import { McpToolUtils } from "../mcp-tool-utils";

describe("McpToolUtils", () => {
  it("prefixed tool name should concatenate with underscore", () => {
    const result = McpToolUtils.prefixedToolName(
      "prefix",
      "server1",
      "toolName",
    );
    expect(result).toBe("p_server1_toolName");
  });

  it("prefixed tool name should replace special characters", () => {
    const result = McpToolUtils.prefixedToolName(
      "pre.fix",
      "server1",
      "tool@Name",
    );
    expect(result).toBe("p_server1_toolName");
  });

  it("prefixed tool name should replace hyphens with underscores", () => {
    const result = McpToolUtils.prefixedToolName("p", "tool-name");
    expect(result).toBe("p_tool_name");
  });

  it("prefixed tool name should truncate long strings", () => {
    const longPrefix = "a".repeat(40);
    const longToolName = "b".repeat(62);
    const result = McpToolUtils.prefixedToolName(longPrefix, longToolName);
    expect(result).toHaveLength(64);
    expect(result.endsWith(`_${longToolName}`)).toBe(true);
  });

  it("prefixed tool name should throw exception for null or empty inputs", () => {
    expect(() =>
      McpToolUtils.prefixedToolName(null as unknown as string, "toolName"),
    ).toThrow("Prefix or toolName cannot be null or empty");

    expect(() => McpToolUtils.prefixedToolName("", "toolName")).toThrow(
      "Prefix or toolName cannot be null or empty",
    );

    expect(() =>
      McpToolUtils.prefixedToolName("prefix", null as unknown as string),
    ).toThrow("Prefix or toolName cannot be null or empty");

    expect(() => McpToolUtils.prefixedToolName("prefix", "")).toThrow(
      "Prefix or toolName cannot be null or empty",
    );
  });

  it("prefixed tool name should support Chinese characters", () => {
    const result = McpToolUtils.prefixedToolName("前缀", "工具名称");
    expect(result).toBe("前_工具名称");
  });

  it("prefixed tool name should support mixed Chinese and English", () => {
    const result = McpToolUtils.prefixedToolName("prefix前缀", "tool工具Name");
    expect(result).toBe("p_tool工具Name");
  });

  it("prefixed tool name should remove special characters but keep Chinese", () => {
    const result = McpToolUtils.prefixedToolName(
      "pre@fix前缀",
      "tool#工具$name",
    );
    expect(result).toBe("p_tool工具name");
  });

  it("prefixed tool name should handle Chinese with hyphens", () => {
    const result = McpToolUtils.prefixedToolName("前缀-test", "工具-name");
    expect(result).toBe("前_t_工具_name");
  });

  it("prefixed tool name should truncate long Chinese strings", () => {
    // Create a string with Chinese characters that exceeds 64 characters
    const longPrefix = "前缀".repeat(20); // 40 Chinese characters
    const longToolName = "工具".repeat(20); // 40 Chinese characters
    const result = McpToolUtils.prefixedToolName(longPrefix, longToolName);
    expect(result).toHaveLength(42);
    expect(result.endsWith(`_${"工具".repeat(20)}`)).toBe(true);
  });

  it("prefixed tool name should handle Chinese punctuation", () => {
    const result = McpToolUtils.prefixedToolName("前缀，测试", "工具。名称！");
    expect(result).toBe("前_工具名称");
  });

  it("prefixed tool name should handle Unicode boundaries", () => {
    // Test characters at the boundaries of the Chinese Unicode range
    const result1 = McpToolUtils.prefixedToolName("prefix", "tool\u4e00"); // First
    // Chinese
    // character
    expect(result1).toBe("p_tool\u4e00");

    const result2 = McpToolUtils.prefixedToolName("prefix", "tool\u9fa5"); // Last
    // Chinese
    // character
    expect(result2).toBe("p_tool\u9fa5");
  });

  it("prefixed tool name should exclude non Chinese Unicode characters", () => {
    // Test with Japanese Hiragana (outside Chinese range)
    const result1 = McpToolUtils.prefixedToolName("prefix", "toolあ"); // Japanese
    // Hiragana
    expect(result1).toBe("p_tool");

    // Test with Korean characters (outside Chinese range)
    const result2 = McpToolUtils.prefixedToolName("prefix", "tool한"); // Korean
    // character
    expect(result2).toBe("p_tool");

    // Test with Arabic characters (outside Chinese range)
    const result3 = McpToolUtils.prefixedToolName("prefix", "toolع"); // Arabic
    // character
    expect(result3).toBe("p_tool");
  });

  it("prefixed tool name should handle emojis and symbols", () => {
    // Emojis and symbols should be removed
    const result = McpToolUtils.prefixedToolName("prefix🚀", "tool工具😀name");
    expect(result).toBe("p_tool工具name");
  });

  it("prefixed tool name should preserve numbers with Chinese", () => {
    const result = McpToolUtils.prefixedToolName("前缀123", "工具456名称");
    expect(result).toBe("前_工具456名称");
  });

  it("prefixed tool name should support extended Han characters", () => {
    // Test boundary character at end of CJK Unified Ideographs block
    const result1 = McpToolUtils.prefixedToolName("prefix", "tool\u9fff"); // CJK
    // block
    // boundary
    expect(result1).toBe("p_tool\u9fff");

    // Test CJK Extension A characters
    const result2 = McpToolUtils.prefixedToolName("prefix", "tool\u3400"); // CJK Ext
    // A
    expect(result2).toBe("p_tool\u3400");
  });

  it("prefixed tool name should support compatibility ideographs", () => {
    // Test CJK Compatibility Ideographs
    const result = McpToolUtils.prefixedToolName("prefix", "tool\uf900"); // Compatibility
    // ideograph
    expect(result).toBe("p_tool\uf900");
  });

  it("prefixed tool name should handle all Han script characters", () => {
    // Mix of different Han character blocks: Extension A + CJK Unified +
    // Compatibility
    const result = McpToolUtils.prefixedToolName(
      "前缀\u3400",
      "缀\\u3400",
      "工具\u9fff名称\uf900",
    );
    expect(result).toBe("前_缀u3400_工具鿿名称豈");
  });
});
