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
import { SimpleTemplateRenderer } from "../simple-template-renderer.js";

describe("SimpleTemplateRenderer", () => {
  it("should replace placeholders from variables", () => {
    const renderer = new SimpleTemplateRenderer();

    expect(renderer.apply("Hello {name}!", { name: "Spring AI" })).toBe(
      "Hello Spring AI!",
    );
  });

  it("should throw when placeholders are missing", () => {
    const renderer = new SimpleTemplateRenderer();

    expect(() =>
      renderer.apply("Hello {name} {missing}!", { name: "Spring AI" }),
    ).toThrow(
      "Not all variables were replaced in the template. Missing variable names are:",
    );
  });

  it("should stringify non-string values", () => {
    const renderer = new SimpleTemplateRenderer();

    expect(renderer.apply("Count: {count}", { count: 3, enabled: true })).toBe(
      "Count: 3",
    );
  });

  it("should render undefined values as blank", () => {
    const renderer = new SimpleTemplateRenderer();

    expect(renderer.apply("Value: {value}", { value: undefined })).toBe(
      "Value: ",
    );
  });

  it("should not resolve inherited properties", () => {
    const renderer = new SimpleTemplateRenderer();

    const variables = Object.create({
      inherited: "should not render",
    }) as Record<string, unknown>;

    expect(() => renderer.apply("Value: {inherited}", variables)).toThrow(
      "Not all variables were replaced in the template. Missing variable names are:",
    );
  });
});
