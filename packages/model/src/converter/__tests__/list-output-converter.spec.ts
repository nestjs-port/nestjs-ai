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
import { ListOutputConverter } from "../list-output-converter.js";

describe("ListOutputConverter", () => {
  const converter = new ListOutputConverter();

  it("csv", async () => {
    expect(await converter.convert("foo, bar, baz")).toEqual([
      "foo",
      "bar",
      "baz",
    ]);
  });

  it("csv without spaces", async () => {
    expect(await converter.convert("A,B,C")).toEqual(["A", "B", "C"]);
  });

  it("csv with extra spaces", async () => {
    expect(await converter.convert("A  ,   B   ,  C  ")).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("csv with single item", async () => {
    expect(await converter.convert("single-item")).toEqual(["single-item"]);
  });

  it("csv with empty string", async () => {
    expect(await converter.convert("")).toEqual([]);
  });

  it("csv with empty values", async () => {
    expect(await converter.convert("A, , C")).toEqual(["A", "", "C"]);
  });

  it("csv with only commas", async () => {
    expect(await converter.convert(",,")).toEqual(["", "", ""]);
  });

  it("csv with trailing comma", async () => {
    expect(await converter.convert("A, B,")).toEqual(["A", "B", ""]);
  });

  it("csv with leading comma", async () => {
    expect(await converter.convert(", A, B")).toEqual(["", "A", "B"]);
  });

  it("csv with only whitespace", async () => {
    expect(await converter.convert("   \t\n   ")).toEqual([""]);
  });

  it.each(["a,b,c", "1,2,3", "X,Y,Z", "alpha,beta,gamma"])(
    "csv with various inputs: %s",
    async (csvString) => {
      const result = await converter.convert(csvString);
      expect(result).toHaveLength(3);
      expect(result.every((v) => v != null)).toBe(true);
    },
  );

  it("csv with tabs and special whitespace", async () => {
    const list = await converter.convert("A\t, \tB\r, \nC ");
    expect(list).toHaveLength(3);
    expect(list.every((v) => v != null)).toBe(true);
  });

  it("csv with only spaces and commas", async () => {
    expect(await converter.convert(" , , ")).toEqual(["", "", ""]);
  });

  it("csv with boolean-like values", async () => {
    expect(
      await converter.convert("true, false, TRUE, FALSE, yes, no"),
    ).toEqual(["true", "false", "TRUE", "FALSE", "yes", "no"]);
  });

  it("csv with different data types", async () => {
    expect(await converter.convert("string, 123, 45.67, true, null")).toEqual([
      "string",
      "123",
      "45.67",
      "true",
      "null",
    ]);
  });

  it("csv with alternative delimiters", async () => {
    const list = await converter.convert("A; B; C");
    expect(list.length).toBeGreaterThan(0);
  });

  it("csv with quoted values", async () => {
    const list = await converter.convert(
      '"quoted value", normal, "another quoted"',
    );
    expect(list).toHaveLength(3);
    expect(list.every((v) => v != null)).toBe(true);
  });

  it("csv with escaped quotes", async () => {
    const list = await converter.convert(
      '"value with ""quotes""", normal, "escaped"',
    );
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((v) => v != null)).toBe(true);
  });

  it("csv with commas in quoted values", async () => {
    const list = await converter.convert(
      '"value, with, commas", normal, "another, comma"',
    );
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((v) => v != null)).toBe(true);
  });

  it("csv with newlines in quoted values", async () => {
    const list = await converter.convert(
      '"line1\nline2", normal, "another\nline"',
    );
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((v) => v != null)).toBe(true);
  });

  it("csv with mixed quoting styles", async () => {
    const list = await converter.convert(
      "'single quoted', \"double quoted\", `backtick quoted`, unquoted",
    );
    expect(list).toHaveLength(4);
    expect(list.every((v) => v != null)).toBe(true);
  });

  it("csv with only commas and spaces", async () => {
    const list = await converter.convert(" , , , ");
    expect(list).toHaveLength(4);
    expect(list.every((v) => v === "")).toBe(true);
  });

  it("csv with malformed quoting", async () => {
    const list = await converter.convert(
      '"unclosed quote, normal, "properly closed"',
    );
    expect(list.length).toBeGreaterThan(0);
  });
});
