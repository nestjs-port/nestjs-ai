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

import { MessageType } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { EventFilter } from "../event-filter.js";

/**
 * Validates the constructor contracts of {@link EventFilter}.
 */
describe("EventFilterValidation", () => {
  // --- keyword normalization ---

  it("blank keyword is normalized to null", () => {
    expect(new EventFilter({ keyword: "   " }).keyword).toBeNull();
    expect(new EventFilter({ keyword: "" }).keyword).toBeNull();
  });

  it("null keyword remains null", () => {
    expect(new EventFilter({ keyword: null }).keyword).toBeNull();
  });

  it("keyword is lowercased", () => {
    expect(new EventFilter({ keyword: "Spring AI" }).keyword).toBe("spring ai");
  });

  // --- lastN ---

  it("last n zero is rejected", () => {
    expect(() => new EventFilter({ lastN: 0 })).toThrow(
      "lastN must be greater than 0",
    );
  });

  it("last n negative is rejected", () => {
    expect(() => new EventFilter({ lastN: -1 })).toThrow(
      "lastN must be greater than 0",
    );
  });

  it("last n positive is accepted", () => {
    const filter = new EventFilter({ lastN: 5 });
    expect(filter.lastN).toBe(5);
  });

  // --- pageSize ---

  it("page size zero is rejected", () => {
    expect(() => new EventFilter({ pageSize: 0 })).toThrow(
      "pageSize must be greater than 0",
    );
  });

  it("page size negative is rejected", () => {
    expect(() => new EventFilter({ pageSize: -1 })).toThrow(
      "pageSize must be greater than 0",
    );
  });

  // --- page ---

  it("page negative is rejected", () => {
    expect(() => new EventFilter({ page: -1, pageSize: 10 })).toThrow(
      "page must be >= 0",
    );
  });

  it("page without page size is rejected", () => {
    expect(() => new EventFilter({ page: 1 })).toThrow(
      "pageSize must be set when page is set",
    );
  });

  // --- page defaults ---

  it("page size without page defaults to zero", () => {
    const filter = new EventFilter({ pageSize: 10 });
    expect(filter.page).toBe(0);
    expect(filter.pageSize).toBe(10);
  });

  it("page size with explicit page is preserved", () => {
    const filter = new EventFilter({ page: 2, pageSize: 10 });
    expect(filter.page).toBe(2);
  });

  // --- messageTypes normalization ---

  it("empty message types set is normalized to null", () => {
    const filter = new EventFilter({ messageTypes: new Set<MessageType>() });
    expect(filter.messageTypes).toBeNull();
  });

  it("non empty message types set is preserved", () => {
    const filter = new EventFilter({
      messageTypes: new Set([MessageType.USER]),
    });
    expect([...filter.messageTypes!]).toEqual([MessageType.USER]);
  });

  // --- mutual exclusion ---

  it("last n and page size are mutually exclusive", () => {
    expect(() => new EventFilter({ lastN: 5, pageSize: 10 })).toThrow(
      "mutually exclusive",
    );
  });

  it("last n and page with page size are mutually exclusive", () => {
    expect(() => new EventFilter({ lastN: 5, page: 0, pageSize: 10 })).toThrow(
      "mutually exclusive",
    );
  });
});
