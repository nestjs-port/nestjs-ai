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

import { ValidationMode } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { StTemplateRenderer } from "../st-template-renderer.js";

describe("StTemplateRenderer", () => {
  it("should handle multiple built in functions and variables", () => {
    const renderer = new StTemplateRenderer();
    const variables: Record<string, unknown> = {
      list: ["a", "b", "c"],
      name: "Mark",
    };
    const template = "{name}: {first(list)}, {last(list)}";
    const result = renderer.apply(template, variables);
    expect(result).toBe("Mark: a, c");
  });

  it("should support valid nested function expression in st4", () => {
    const variables: Record<string, unknown> = {
      words: ["hello", "WORLD"],
    };
    const template = "{first(words)} {last(words)} {length(words)}";
    const defaultRenderer = new StTemplateRenderer();
    const defaultResult = defaultRenderer.apply(template, variables);
    expect(defaultResult).toBe("hello WORLD 2");
  });

  it("should handle nested built in functions", () => {
    const variables: Record<string, unknown> = {
      words: ["hello", "WORLD"],
    };
    const template = "{first(words)} {last(words)} {length(words)}";
    const renderer = new StTemplateRenderer({
      validateStFunctions: true,
    });
    const result = renderer.apply(template, variables);
    expect(result).toBe("hello WORLD 2");
  });

  it("should not report built in functions as missing variables in throw mode", () => {
    const renderer = new StTemplateRenderer({
      validationMode: ValidationMode.THROW,
    });
    const variables: Record<string, unknown> = {
      memory: "abc",
    };
    const template = "{if(strlen(memory))}ok{endif}";
    const result = renderer.apply(template, variables);
    expect(result).toBe("ok");
  });

  it("should not report built in functions as missing variables in warn mode", () => {
    const renderer = new StTemplateRenderer({
      validationMode: ValidationMode.WARN,
    });
    const variables: Record<string, unknown> = {
      memory: "abc",
    };
    const template = "{if(strlen(memory))}ok{endif}";
    const result = renderer.apply(template, variables);
    expect(result).toBe("ok");
  });

  it("should handle variable names similar to built in functions", () => {
    const renderer = new StTemplateRenderer();
    const variables: Record<string, unknown> = {
      lengthy: "foo",
      firstName: "bar",
    };
    const template = "{lengthy} {firstName}";
    const result = renderer.apply(template, variables);
    expect(result).toBe("foo bar");
  });

  it("should render escaped delimiters", () => {
    const renderer = new StTemplateRenderer();
    const variables: Record<string, unknown> = {
      x: "y",
    };
    const template = "{x} \\{foo\\}";
    const result = renderer.apply(template, variables);
    expect(result).toBe("y {foo}");
  });

  it("should render static text template", () => {
    const renderer = new StTemplateRenderer();
    const variables: Record<string, unknown> = {};
    const template = "Just static text.";
    const result = renderer.apply(template, variables);
    expect(result).toBe("Just static text.");
  });

  it("should handle large number of variables", () => {
    const renderer = new StTemplateRenderer();
    const variables: Record<string, unknown> = {};
    const templateParts: string[] = [];
    for (let i = 0; i < 100; i++) {
      const key = `var${i}`;
      variables[key] = i;
      templateParts.push(`{${key}}`);
    }
    const template = templateParts.join(" ");
    const result = renderer.apply(template, variables);
    const expectedParts: string[] = [];
    for (let i = 0; i < 100; i++) {
      expectedParts.push(String(i));
    }
    const expected = expectedParts.join(" ");
    expect(result).toBe(expected);
  });

  it("should render unicode and special characters", () => {
    const renderer = new StTemplateRenderer();
    const variables: Record<string, unknown> = {
      emoji: "😀",
      accented: "Café",
    };
    const template = "{emoji} {accented}";
    const result = renderer.apply(template, variables);
    expect(result).toBe("😀 Café");
  });

  it("should render null variable values as blank", () => {
    const renderer = new StTemplateRenderer();
    const variables: Record<string, unknown> = {
      foo: null,
    };
    const template = "Value: {foo}";
    const result = renderer.apply(template, variables);
    expect(result).toBe("Value: ");
  });
});
