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
 * Unit tests for {@link EventFilter.merge}.
 *
 * Contract: fields from `other` win when non-null/non-default; `excludeSynthetic` is
 * OR-ed so either side can opt in.
 */
describe("EventFilterMerge", () => {
  // --- other fields win when set ---

  it("other last n overrides base", () => {
    const base = EventFilter.lastN(10);
    const other = EventFilter.lastN(3);
    expect(base.merge(other).lastN).toBe(3);
  });

  it("other branch overrides base", () => {
    const base = EventFilter.forBranch("orch");
    const other = EventFilter.forBranch("orch.researcher");
    expect(base.merge(other).branch).toBe("orch.researcher");
  });

  it("other from overrides base", () => {
    const t1 = new Date("2025-01-01T00:00:00Z");
    const t2 = new Date("2025-06-01T00:00:00Z");
    const base = new EventFilter({ from: t1 });
    const other = new EventFilter({ from: t2 });
    expect(base.merge(other).from).toEqual(t2);
  });

  it("other to overrides base", () => {
    const t1 = new Date("2025-12-31T00:00:00Z");
    const t2 = new Date("2025-06-30T00:00:00Z");
    const base = new EventFilter({ to: t1 });
    const other = new EventFilter({ to: t2 });
    expect(base.merge(other).to).toEqual(t2);
  });

  it("other message types override base", () => {
    const base = new EventFilter({ messageTypes: new Set([MessageType.USER]) });
    const other = new EventFilter({
      messageTypes: new Set([MessageType.ASSISTANT]),
    });
    expect([...base.merge(other).messageTypes!]).toEqual([
      MessageType.ASSISTANT,
    ]);
  });

  it("other keyword overrides base", () => {
    const base = new EventFilter({ keyword: "spring", pageSize: 5 });
    const other = new EventFilter({ keyword: "ai", pageSize: 5 });
    expect(base.merge(other).keyword).toBe("ai");
  });

  it("other page and page size override base", () => {
    const base = new EventFilter({ page: 0, pageSize: 10 });
    const other = new EventFilter({ page: 2, pageSize: 5 });
    const merged = base.merge(other);
    expect(merged.page).toBe(2);
    expect(merged.pageSize).toBe(5);
  });

  // --- base fields are kept when other has no value ---

  it("base last n kept when other is all", () => {
    const base = EventFilter.lastN(5);
    const other = EventFilter.all();
    expect(base.merge(other).lastN).toBe(5);
  });

  it("base branch kept when other has no branch", () => {
    const base = EventFilter.forBranch("orch.writer");
    const other = EventFilter.all();
    expect(base.merge(other).branch).toBe("orch.writer");
  });

  // --- excludeSynthetic is OR-ed ---

  it("exclude synthetic is true when either side is true", () => {
    expect(
      EventFilter.all().merge(EventFilter.realOnly()).excludeSynthetic,
    ).toBe(true);
    expect(
      EventFilter.realOnly().merge(EventFilter.all()).excludeSynthetic,
    ).toBe(true);
  });

  it("exclude synthetic is false when both are false", () => {
    expect(EventFilter.all().merge(EventFilter.all()).excludeSynthetic).toBe(
      false,
    );
  });

  // --- excludeArchived is OR-ed ---

  it("exclude archived is true when either side is true", () => {
    expect(EventFilter.all().merge(EventFilter.active()).excludeArchived).toBe(
      true,
    );
    expect(EventFilter.active().merge(EventFilter.all()).excludeArchived).toBe(
      true,
    );
  });

  it("exclude archived is false when both are false", () => {
    expect(EventFilter.all().merge(EventFilter.all()).excludeArchived).toBe(
      false,
    );
  });

  // --- merging two EventFilter.all() produces all() ---

  it("merging two all filters produces all", () => {
    const merged = EventFilter.all().merge(EventFilter.all());
    expect(merged).toEqual(EventFilter.all());
  });
});
