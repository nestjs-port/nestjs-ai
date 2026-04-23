/*
 * Copyright 2026-present the original author or authors.
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
import { MessageType } from "../message-type.js";

describe("MessageType", () => {
  it("should resolve message types from their names", () => {
    expect(MessageType.valueOf("USER")).toBe(MessageType.USER);
    expect(MessageType.valueOf("ASSISTANT")).toBe(MessageType.ASSISTANT);
    expect(MessageType.valueOf("SYSTEM")).toBe(MessageType.SYSTEM);
    expect(MessageType.valueOf("TOOL")).toBe(MessageType.TOOL);
  });

  it("should throw for unknown message type names", () => {
    expect(() => MessageType.valueOf("UNKNOWN")).toThrow(
      "Unknown message type: UNKNOWN",
    );
  });
});
