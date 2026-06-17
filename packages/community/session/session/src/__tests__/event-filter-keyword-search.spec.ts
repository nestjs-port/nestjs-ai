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

import { AssistantMessage, UserMessage } from "@nestjs-ai/model";
import { beforeEach, describe, expect, it } from "vitest";
import { EventFilter } from "../event-filter.js";
import { InMemorySessionRepository } from "../in-memory-session-repository.js";
import { SessionEvent } from "../session-event.js";
import { Session } from "../session.js";

/**
 * Tests for keyword search and pagination in {@link EventFilter} and
 * {@link InMemorySessionRepository}.
 */
describe("EventFilterKeywordSearch", () => {
  const SESSION_ID = "test-session";

  let repository: InMemorySessionRepository;

  beforeEach(async () => {
    repository = new InMemorySessionRepository();
    const session = new Session({ id: SESSION_ID, userId: "test-user" });
    await repository.save(session);
  });

  // --- EventFilter.matches() ---

  it("matches returns true when keyword found case insensitive", () => {
    const event = new SessionEvent({
      sessionId: SESSION_ID,
      message: UserMessage.of("Spring AI is awesome"),
    });
    expect(EventFilter.keywordSearch("spring ai").matches(event)).toBe(true);
    expect(EventFilter.keywordSearch("AWESOME").matches(event)).toBe(true);
    expect(EventFilter.keywordSearch("is").matches(event)).toBe(true);
  });

  it("matches returns false when keyword not found", () => {
    const event = new SessionEvent({
      sessionId: SESSION_ID,
      message: UserMessage.of("Spring AI is awesome"),
    });
    expect(EventFilter.keywordSearch("memory").matches(event)).toBe(false);
  });

  it("matches returns false when message text is null", () => {
    // AssistantMessage with no text (e.g. tool-call only) has null/empty getText()
    const event = new SessionEvent({
      sessionId: SESSION_ID,
      message: AssistantMessage.of(""),
    });
    expect(EventFilter.keywordSearch("anything").matches(event)).toBe(false);
  });

  it("matches returns true when keyword is null or blank", () => {
    // keyword=null means no keyword filter — all events should pass
    const event = new SessionEvent({
      sessionId: SESSION_ID,
      message: UserMessage.of("hello"),
    });
    expect(EventFilter.all().matches(event)).toBe(true);
  });

  // --- Repository keyword search ---

  it("find events returns only matching events", async () => {
    await appendText("Spring AI is a great framework");
    await appendText("I like machine learning");
    await appendText("Spring Boot is also useful");
    await appendText("Deep learning is fascinating");

    const results = await repository.findEvents(
      SESSION_ID,
      EventFilter.keywordSearch("spring"),
    );

    expect(results).toHaveLength(2);
    expect(results[0].message.text).toBe("Spring AI is a great framework");
    expect(results[1].message.text).toBe("Spring Boot is also useful");
  });

  it("find events keyword is case insensitive", async () => {
    await appendText("Spring AI rocks");
    await appendText("spring boot too");
    await appendText("nothing here");

    const results = await repository.findEvents(
      SESSION_ID,
      EventFilter.keywordSearch("SPRING"),
    );

    expect(results).toHaveLength(2);
  });

  it("find events returns empty when no match", async () => {
    await appendText("Spring AI is great");
    await appendText("Machine learning too");

    const results = await repository.findEvents(
      SESSION_ID,
      EventFilter.keywordSearch("nosuchthing"),
    );

    expect(results).toHaveLength(0);
  });

  // --- Pagination ---

  it("pagination first page returns correct slice", async () => {
    for (let i = 1; i <= 7; i++) {
      await appendText(`spring message ${i}`);
    }

    const page0 = await repository.findEvents(
      SESSION_ID,
      EventFilter.keywordSearch("spring message", 0, 3),
    );
    const page1 = await repository.findEvents(
      SESSION_ID,
      EventFilter.keywordSearch("spring message", 1, 3),
    );
    const page2 = await repository.findEvents(
      SESSION_ID,
      EventFilter.keywordSearch("spring message", 2, 3),
    );

    expect(page0).toHaveLength(3);
    expect(page0[0].message.text).toBe("spring message 1");
    expect(page0[2].message.text).toBe("spring message 3");

    expect(page1).toHaveLength(3);
    expect(page1[0].message.text).toBe("spring message 4");
    expect(page1[2].message.text).toBe("spring message 6");

    expect(page2).toHaveLength(1);
    expect(page2[0].message.text).toBe("spring message 7");
  });

  it("pagination beyond last page returns empty", async () => {
    await appendText("spring message 1");
    await appendText("spring message 2");

    const result = await repository.findEvents(
      SESSION_ID,
      EventFilter.keywordSearch("spring message", 5, 10),
    );

    expect(result).toHaveLength(0);
  });

  it("pagination first page default page size", async () => {
    for (let i = 1; i <= 15; i++) {
      await appendText(`entry ${i}`);
    }

    // Default page size is 10; first page should return events 1–10
    const page0 = await repository.findEvents(
      SESSION_ID,
      EventFilter.keywordSearch("entry"),
    );

    expect(page0).toHaveLength(EventFilter.DEFAULT_PAGE_SIZE);
    expect(page0[0].message.text).toBe("entry 1");
    expect(page0[9].message.text).toBe("entry 10");
  });

  it("pagination only matching events are included", async () => {
    // 5 matching + 5 non-matching interleaved
    for (let i = 1; i <= 5; i++) {
      await appendText(`keyword hit ${i}`);
      await appendText(`no match ${i}`);
    }

    const results = await repository.findEvents(
      SESSION_ID,
      EventFilter.keywordSearch("keyword hit", 0, 10),
    );

    expect(results).toHaveLength(5);
    results.forEach((e) =>
      expect(e.message.text!.startsWith("keyword hit")).toBe(true),
    );
  });

  // --- helpers ---

  async function appendText(text: string): Promise<void> {
    await repository.appendEvent(
      new SessionEvent({
        sessionId: SESSION_ID,
        message: UserMessage.of(text),
      }),
    );
  }
});
