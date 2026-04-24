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

import {
  TemplateRendererFactory,
  type TemplateRenderer,
} from "@nestjs-ai/commons";
import { beforeEach, describe, expect, it } from "vitest";
import { PromptTemplate } from "../prompt-template.js";

describe("PromptTemplateBuilder", () => {
  beforeEach(() => {
    TemplateRendererFactory.reset();
  });

  it("null template should throw", () => {
    expect(() =>
      PromptTemplate.builder().template(null as unknown as string),
    ).toThrow("template cannot be null or empty");
  });

  it("empty template should throw", () => {
    expect(() => PromptTemplate.builder().template("")).toThrow(
      "template cannot be null or empty",
    );
  });

  it("null resource should throw", () => {
    expect(() =>
      PromptTemplate.builder().resource(null as unknown as Buffer),
    ).toThrow("resource cannot be null");
  });

  it("null variables should throw", () => {
    expect(() =>
      PromptTemplate.builder().variables(
        null as unknown as Record<string, unknown>,
      ),
    ).toThrow("variables cannot be null");
  });

  // Java test `builderNullVariableKeyShouldThrow` is not applicable in TypeScript
  // because JavaScript objects cannot have null keys (null is coerced to the string "null").

  it("null renderer should throw", () => {
    expect(() =>
      PromptTemplate.builder().renderer(null as unknown as TemplateRenderer),
    ).toThrow("renderer cannot be null");
  });

  it("render with missing variable should throw", () => {
    const promptTemplate = PromptTemplate.builder()
      .template("Hello {name}!")
      .build();

    expect(() => promptTemplate.render()).toThrow(
      "Not all variables were replaced in the template. Missing variable names are: name.",
    );
  });

  it("whitespace only template should throw", () => {
    expect(() => PromptTemplate.builder().template("   ")).toThrow(
      "template cannot be null or empty",
    );
  });

  it("empty variables map should work", () => {
    const promptTemplate = PromptTemplate.builder()
      .template("Status: active")
      .variables({})
      .build();

    expect(promptTemplate.render()).toBe("Status: active");
  });

  it("null variable value should work", () => {
    const promptTemplate = PromptTemplate.builder()
      .template("Result: {value}")
      .variables({ value: null })
      .build();

    const result = promptTemplate.render();
    expect(result).toBe("Result: ");
  });

  it("multiple missing variables should throw", () => {
    const promptTemplate = PromptTemplate.builder()
      .template("Processing {item} with {type} at {level}")
      .build();

    let errorMessage = "";
    try {
      promptTemplate.render();
      expect.fail("Expected error to be thrown");
    } catch (e) {
      errorMessage = (e as Error).message;
    }
    expect(errorMessage).toContain(
      "Not all variables were replaced in the template",
    );
    expect(errorMessage).toContain("item");
    expect(errorMessage).toContain("type");
    expect(errorMessage).toContain("level");
  });

  it("partial variables should throw", () => {
    const promptTemplate = PromptTemplate.builder()
      .template("Processing {item} with {type}")
      .variables({ item: "data" })
      .build();

    expect(() => promptTemplate.render()).toThrow(
      "Missing variable names are: type",
    );
  });

  it("complete variables should render", () => {
    const promptTemplate = PromptTemplate.builder()
      .template("Processing {item} with count {count}")
      .variables({ item: "data", count: 42 })
      .build();

    expect(promptTemplate.render()).toBe("Processing data with count 42");
  });

  it("empty string variable should work", () => {
    const promptTemplate = PromptTemplate.builder()
      .template("Hello '{name}'!")
      .variables({ name: "" })
      .build();

    expect(promptTemplate.render()).toBe("Hello ''!");
  });
});
