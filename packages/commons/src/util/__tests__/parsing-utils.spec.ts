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
import { ParsingUtils } from "../parsing-utils";

describe("ParsingUtils", () => {
  describe("splitCamelCase", () => {
    it("should split camelCase string", () => {
      expect(ParsingUtils.splitCamelCase("camelCase")).toEqual([
        "camel",
        "Case",
      ]);
    });

    it("should split PascalCase string", () => {
      expect(ParsingUtils.splitCamelCase("PascalCase")).toEqual([
        "Pascal",
        "Case",
      ]);
    });

    it("should handle single word", () => {
      expect(ParsingUtils.splitCamelCase("word")).toEqual(["word"]);
    });

    it("should handle multiple words", () => {
      expect(ParsingUtils.splitCamelCase("getUserName")).toEqual([
        "get",
        "User",
        "Name",
      ]);
    });

    it("should throw error for null source", () => {
      expect(() =>
        ParsingUtils.splitCamelCase(null as unknown as string),
      ).toThrow("Source string must not be null");
    });
  });

  describe("splitCamelCaseToLower", () => {
    it("should split camelCase string to lower case", () => {
      expect(ParsingUtils.splitCamelCaseToLower("camelCase")).toEqual([
        "camel",
        "case",
      ]);
    });

    it("should split PascalCase string to lower case", () => {
      expect(ParsingUtils.splitCamelCaseToLower("PascalCase")).toEqual([
        "pascal",
        "case",
      ]);
    });

    it("should handle multiple words", () => {
      expect(ParsingUtils.splitCamelCaseToLower("getUserName")).toEqual([
        "get",
        "user",
        "name",
      ]);
    });
  });

  describe("reConcatenateCamelCase", () => {
    it("should reconcatenate camelCase with space delimiter", () => {
      expect(ParsingUtils.reConcatenateCamelCase("camelCase", " ")).toBe(
        "camel case",
      );
    });

    it("should reconcatenate PascalCase with space delimiter", () => {
      expect(ParsingUtils.reConcatenateCamelCase("PascalCase", " ")).toBe(
        "pascal case",
      );
    });

    it("should reconcatenate with custom delimiter", () => {
      expect(ParsingUtils.reConcatenateCamelCase("getUserName", "-")).toBe(
        "get-user-name",
      );
    });

    it("should handle single word", () => {
      expect(ParsingUtils.reConcatenateCamelCase("word", " ")).toBe("word");
    });

    it("should throw error for null source", () => {
      expect(() =>
        ParsingUtils.reConcatenateCamelCase(null as unknown as string, " "),
      ).toThrow("Source string must not be null");
    });

    it("should throw error for null delimiter", () => {
      expect(() =>
        ParsingUtils.reConcatenateCamelCase("test", null as unknown as string),
      ).toThrow("Delimiter must not be null");
    });
  });
});
