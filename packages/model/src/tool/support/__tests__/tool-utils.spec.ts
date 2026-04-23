/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from "vitest";
import { ToolUtils } from "../tool-utils.js";

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
