export abstract class McpToolUtils {
  static readonly TOOL_CONTEXT_MCP_EXCHANGE_KEY = "exchange";

  static prefixedToolName(
    prefix: string,
    title: string | null,
    toolName: string,
  ): string;

  static prefixedToolName(prefix: string, toolName: string): string;

  static prefixedToolName(
    prefix: string,
    titleOrToolName: string | null,
    toolName?: string,
  ): string {
    if (toolName === undefined) {
      return McpToolUtils.prefixedToolName(
        prefix,
        null,
        titleOrToolName as string,
      );
    }

    if (
      prefix == null ||
      prefix === "" ||
      toolName == null ||
      toolName === ""
    ) {
      throw new Error("Prefix or toolName cannot be null or empty");
    }

    let input = `${McpToolUtils.shorten(McpToolUtils.format(prefix))}`;

    if (titleOrToolName != null && titleOrToolName !== "") {
      // Do not shorten the title.
      input = `${input}_${McpToolUtils.format(titleOrToolName)}`;
    }

    input = `${input}_${McpToolUtils.format(toolName)}`;

    // If the string is longer than 64 characters, keep the last 64 characters
    if (input.length > 64) {
      input = input.substring(input.length - 64);
    }

    return input;
  }

  static format(input: string): string {
    // Replace any character that isn't alphanumeric, underscore, or hyphen with
    // concatenation. Support Han script + CJK blocks for complete Chinese character
    // coverage
    const formatted = input.replace(
      /[^\p{Script=Han}\uF900-\uFAFFa-zA-Z0-9_-]/gu,
      "",
    );

    return formatted.replaceAll("-", "_");
  }

  private static shorten(input: string): string {
    if (input == null || input === "") {
      return "";
    }

    return input
      .toLowerCase()
      .split("_")
      .filter((word) => word !== "")
      .map((word) => word.charAt(0))
      .join("_");
  }
}
