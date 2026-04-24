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

import { assert, describe, expect, it } from "vitest";
import { ObservabilityHelper } from "../observability-helper.js";

describe("ObservabilityHelper", () => {
  it("should get empty brackets for empty map", () => {
    expect(ObservabilityHelper.concatenateEntries({})).toBe("[]");
  });

  it("should get entries for non-empty map", () => {
    expect(ObservabilityHelper.concatenateEntries({ a: "1", b: "2" })).toBe(
      '["a":"1", "b":"2"]',
    );
  });

  it("should get empty brackets for empty list", () => {
    expect(ObservabilityHelper.concatenateStrings([])).toBe("[]");
  });

  it("should get entries for non-empty list", () => {
    expect(ObservabilityHelper.concatenateStrings(["a", "b"])).toBe(
      '["a", "b"]',
    );
  });

  it("should handle single entry map", () => {
    expect(ObservabilityHelper.concatenateEntries({ key: "value" })).toBe(
      '["key":"value"]',
    );
  });

  it("should handle single entry list", () => {
    expect(ObservabilityHelper.concatenateStrings(["single"])).toBe(
      '["single"]',
    );
  });

  it("should handle empty strings in list", () => {
    expect(ObservabilityHelper.concatenateStrings(["", "non-empty", ""])).toBe(
      '["", "non-empty", ""]',
    );
  });

  it("should handle null inputs gracefully", () => {
    expect(() =>
      ObservabilityHelper.concatenateEntries(
        null as unknown as Record<string, unknown>,
      ),
    ).toThrow("Cannot convert undefined or null to object");
    expect(() =>
      ObservabilityHelper.concatenateStrings(null as unknown as string[]),
    ).toThrow("Cannot read properties of null (reading 'map')");
  });

  it("should handle null values in map", () => {
    const result = ObservabilityHelper.concatenateEntries({
      key1: "value1",
      key2: null,
      key3: "value3",
    });

    expect(result).toContain('"key1":"value1"');
    expect(result).toContain('"key2":"null"');
    expect(result).toContain('"key3":"value3"');
  });

  it("should handle null values in list", () => {
    const result = ObservabilityHelper.concatenateStrings([
      "first",
      null as unknown as string,
      "third",
    ]);

    expect(result).toContain('"first"');
    expect(result).toContain('"null"');
    expect(result).toContain('"third"');
  });

  it("should handle special characters in map values", () => {
    const result = ObservabilityHelper.concatenateEntries({
      quotes: 'value with "quotes"',
      newlines: "value\nwith\nnewlines",
      tabs: "value\twith\ttabs",
      backslashes: "value\\with\\backslashes",
    });

    assert.exists(result);
    expect(result.startsWith("[")).toBe(true);
    expect(result.endsWith("]")).toBe(true);
    expect(result).toContain("quotes");
    expect(result).toContain("newlines");
  });

  it("should handle special characters in list", () => {
    const result = ObservabilityHelper.concatenateStrings([
      'string with "quotes"',
      "string\nwith\nnewlines",
      "string\twith\ttabs",
      "string\\with\\backslashes",
    ]);

    assert.exists(result);
    expect(result.startsWith("[")).toBe(true);
    expect(result.endsWith("]")).toBe(true);
    expect(result).toContain("quotes");
    expect(result).toContain("newlines");
  });

  it("should handle whitespace-only strings", () => {
    const result = ObservabilityHelper.concatenateStrings([
      "   ",
      "\t",
      "\n",
      " \t\n ",
    ]);

    assert.exists(result);
    expect(result.startsWith("[")).toBe(true);
    expect(result.endsWith("]")).toBe(true);
    expect(result).toContain('"   "');
  });

  it("should handle numeric and boolean values", () => {
    const result = ObservabilityHelper.concatenateEntries({
      integer: 1,
      double: 1.1,
      boolean: true,
      string: "text",
    });

    expect(result).toContain("1");
    expect(result).toContain("1.1");
    expect(result).toContain("true");
    expect(result).toContain("text");
  });

  it("should maintain order for ordered maps", () => {
    const result = ObservabilityHelper.concatenateEntries(
      Object.fromEntries([
        ["a", "first"],
        ["m", "middle"],
        ["z", "last"],
      ]),
    );

    const posA = result.indexOf('"a"');
    const posM = result.indexOf('"m"');
    const posZ = result.indexOf('"z"');

    expect(posA).toBeLessThan(posM);
    expect(posM).toBeLessThan(posZ);
  });

  it("should handle complex objects as values", () => {
    const result = ObservabilityHelper.concatenateEntries({
      list: ["a", "b"],
      array: ["x", "y"],
      object: {},
    });

    assert.exists(result);
    expect(result).toContain("list");
    expect(result).toContain("array");
    expect(result).toContain("object");
  });

  it("should produce consistent output", () => {
    const map = { key: "value" };
    const list = ["item"];

    const mapResult1 = ObservabilityHelper.concatenateEntries(map);
    const mapResult2 = ObservabilityHelper.concatenateEntries(map);
    const listResult1 = ObservabilityHelper.concatenateStrings(list);
    const listResult2 = ObservabilityHelper.concatenateStrings(list);

    expect(mapResult1).toBe(mapResult2);
    expect(listResult1).toBe(listResult2);
  });

  it("should handle map with empty string keys", () => {
    const result = ObservabilityHelper.concatenateEntries({
      "": "empty key value",
      normal: "normal value",
    });

    expect(result).toContain('"":"empty key value"');
    expect(result).toContain('"normal":"normal value"');
  });

  it("should format brackets correctly", () => {
    expect(ObservabilityHelper.concatenateEntries({})).toBe("[]");
    expect(ObservabilityHelper.concatenateStrings([])).toBe("[]");

    const singleMapResult = ObservabilityHelper.concatenateEntries({ a: "b" });
    expect(singleMapResult.startsWith("[")).toBe(true);
    expect(singleMapResult.endsWith("]")).toBe(true);

    const singleListResult = ObservabilityHelper.concatenateStrings(["item"]);
    expect(singleListResult.startsWith("[")).toBe(true);
    expect(singleListResult.endsWith("]")).toBe(true);
  });
});
