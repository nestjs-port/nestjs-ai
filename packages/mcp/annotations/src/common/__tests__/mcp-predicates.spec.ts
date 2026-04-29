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
import { McpPredicates } from "../index.js";

/**
 * URI Template Tests
 */
describe("McpPredicates", () => {
  it("test is uri template with simple variable", () => {
    expect(McpPredicates.isUriTemplate("/api/{id}")).toBe(true);
  });

  it("test is uri template with multiple variables", () => {
    expect(McpPredicates.isUriTemplate("/api/{userId}/posts/{postId}")).toBe(
      true,
    );
  });

  it("test is uri template with variable at start", () => {
    expect(McpPredicates.isUriTemplate("{id}/details")).toBe(true);
  });

  it("test is uri template with variable at end", () => {
    expect(McpPredicates.isUriTemplate("/api/users/{id}")).toBe(true);
  });

  it("test is uri template with complex variable name", () => {
    expect(McpPredicates.isUriTemplate("/api/{user_id}")).toBe(true);
    expect(McpPredicates.isUriTemplate("/api/{userId123}")).toBe(true);
  });

  it("test is uri template with no variables", () => {
    expect(McpPredicates.isUriTemplate("/api/users")).toBe(false);
  });

  it("test is uri template with empty string", () => {
    expect(McpPredicates.isUriTemplate("")).toBe(false);
  });

  it("test is uri template with only slashes", () => {
    expect(McpPredicates.isUriTemplate("/")).toBe(false);
    expect(McpPredicates.isUriTemplate("//")).toBe(false);
  });

  it("test is uri template with incomplete braces", () => {
    expect(McpPredicates.isUriTemplate("/api/{id")).toBe(false);
    expect(McpPredicates.isUriTemplate("/api/id}")).toBe(false);
  });

  it("test is uri template with empty braces", () => {
    expect(McpPredicates.isUriTemplate("/api/{}")).toBe(false);
  });

  it("test is uri template with nested path", () => {
    expect(
      McpPredicates.isUriTemplate(
        "/api/v1/users/{userId}/posts/{postId}/comments",
      ),
    ).toBe(true);
  });

  it("test is uri template with special characters", () => {
    expect(McpPredicates.isUriTemplate("/api/{user-id}")).toBe(true);
    expect(McpPredicates.isUriTemplate("/api/{user.id}")).toBe(true);
  });

  it("test is uri template with query parameters", () => {
    expect(McpPredicates.isUriTemplate("/api/users?id={id}")).toBe(true);
  });

  it("test is uri template with fragment", () => {
    expect(McpPredicates.isUriTemplate("/api/users#{id}")).toBe(true);
  });

  it("test is uri template with multiple consecutive variables", () => {
    expect(McpPredicates.isUriTemplate("/{id}{name}")).toBe(true);
  });
});
