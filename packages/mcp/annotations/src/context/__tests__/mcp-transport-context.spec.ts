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
import { McpTransportContext } from "../index.js";

describe("McpTransportContext", () => {
  it("creates an immutable metadata context", () => {
    const metadata = { header: "value", version: 1 };
    const context = McpTransportContext.create(metadata);

    expect(context).toBeInstanceOf(McpTransportContext);
    expect(context.get("header")).toBe("value");
    expect(context.get("version")).toBe(1);
    expect(context.get("missing")).toBeUndefined();
  });

  it("exposes an empty default context", () => {
    expect(McpTransportContext.EMPTY).toBeInstanceOf(McpTransportContext);
    expect(McpTransportContext.EMPTY.get("anything")).toBeUndefined();
  });
});
