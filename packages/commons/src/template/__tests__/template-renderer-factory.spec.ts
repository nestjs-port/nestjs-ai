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

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoOpTemplateRenderer } from "../no-op-template-renderer.js";
import { TemplateRendererFactory } from "../template-renderer-factory.js";
import type { TemplateRenderer } from "../template-renderer.interface.js";

class CustomTestRenderer implements TemplateRenderer {
  apply(template: string, _variables: Record<string, unknown | null>): string {
    return `${template} (custom)`;
  }
}

describe("TemplateRendererFactory", () => {
  beforeEach(() => {
    TemplateRendererFactory.reset();
  });

  afterEach(() => {
    TemplateRendererFactory.reset();
  });

  it("should use fallback renderer until bound", () => {
    const renderer = TemplateRendererFactory.getTemplateRenderer();
    expect(renderer.apply("Hello {name}!", { name: "Spring AI" })).toBe(
      "Hello {name}!",
    );
  });

  it("should delegate to bound renderer", () => {
    TemplateRendererFactory.bind(new CustomTestRenderer());

    const renderer = TemplateRendererFactory.getTemplateRenderer();
    expect(renderer.apply("Hello {name}!", { name: "Spring AI" })).toBe(
      "Hello {name}! (custom)",
    );
  });

  it("should support rebinding", () => {
    const renderer = TemplateRendererFactory.getTemplateRenderer();

    TemplateRendererFactory.bind(new NoOpTemplateRenderer());
    expect(renderer.apply("Hello {name}!", { name: "Spring AI" })).toBe(
      "Hello {name}!",
    );

    TemplateRendererFactory.bind(new CustomTestRenderer());
    expect(renderer.apply("Hello {name}!", { name: "Spring AI" })).toBe(
      "Hello {name}! (custom)",
    );
  });
});
