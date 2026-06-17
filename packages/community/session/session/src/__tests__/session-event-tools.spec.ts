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

import { AssistantMessage, ToolContext, UserMessage } from "@nestjs-ai/model";
import { beforeEach, describe, expect, it } from "vitest";
import { CreateSessionRequest } from "../create-session-request.js";
import { DefaultSessionService } from "../default-session-service.js";
import { InMemorySessionRepository } from "../in-memory-session-repository.js";
import { SessionEvent } from "../session-event.js";
import type { SessionService } from "../session-service.js";
import { SessionEventTools } from "../tool/session-event-tools.js";

/**
 * Tests for {@link SessionEventTools.conversationSearch}.
 */
describe("SessionEventTools", () => {
  let sessionService: SessionService;
  let tools: SessionEventTools;
  let sessionId: string;

  beforeEach(async () => {
    sessionService = new DefaultSessionService(new InMemorySessionRepository());
    tools = new SessionEventTools({ sessionService });

    const session = await sessionService.create(
      new CreateSessionRequest({ userId: "test-user" }),
    );
    sessionId = session.id;
  });

  it("returns no results when history is empty", async () => {
    const result = await search("anything", 0);
    expect(result).toBe("No results found.");
  });

  it("returns matching messages as json", async () => {
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("Tell me about Spring AI"),
    );
    await sessionService.appendMessage(
      sessionId,
      AssistantMessage.of("Spring AI is a framework..."),
    );
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("What about LangChain?"),
    );
    await sessionService.appendMessage(
      sessionId,
      AssistantMessage.of("LangChain is a Python library."),
    );

    const result = await search("spring", 0);

    expect(result).toContain("Spring AI");
    expect(result).not.toContain("LangChain");
  });

  it("search is case insensitive", async () => {
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("Spring AI rocks"),
    );
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("spring boot too"),
    );

    const result = await search("SPRING", 0);

    expect(result).toContain("Spring AI rocks");
    expect(result).toContain("spring boot too");
  });

  it("returns no results when keyword not found", async () => {
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("Hello world"),
    );
    await sessionService.appendMessage(
      sessionId,
      AssistantMessage.of("Hi there!"),
    );

    const result = await search("kubernetes", 0);

    expect(result).toBe("No results found.");
  });

  it("pagination returns correct page", async () => {
    for (let i = 1; i <= 15; i++) {
      await sessionService.appendMessage(
        sessionId,
        UserMessage.of(`recall item ${i}`),
      );
    }

    const page0 = await search("recall item", 0);
    const page1 = await search("recall item", 1);

    // page 0 should have 10 results (DEFAULT_PAGE_SIZE), page 1 should have 5
    expect(page0).toContain("recall item 1");
    expect(page0).toContain("recall item 10");
    expect(page0).not.toContain("recall item 11");

    expect(page1).toContain("recall item 11");
    expect(page1).toContain("recall item 15");
    expect(page1).not.toContain('recall item 1"'); // not on page 1
  });

  it("pagination beyond last page returns no results", async () => {
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("only one match"),
    );

    const result = await search("only one", 5);

    expect(result).toBe("No results found.");
  });

  it("negative page defaults to first page", async () => {
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("Spring AI memory"),
    );

    // A model might supply page=-1; the tool must not throw and must return page 0
    const withNegative = await tools.conversationSearch(
      { innerThought: "thinking...", query: "spring", page: -1 },
      toolContext(),
    );
    const withZero = await search("spring", 0);

    expect(withNegative).toBe(withZero);
  });

  it("null page defaults to first page", async () => {
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("Spring AI memory"),
    );

    // page=null should behave identically to page=0
    const withNull = await searchWithNullPage("spring");
    const withZero = await search("spring", 0);

    expect(withNull).toBe(withZero);
  });

  it("result contains timestamp type and text", async () => {
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("Spring AI is interesting"),
    );

    const result = await search("interesting", 0);

    expect(result).toContain("timestamp");
    expect(result).toContain("type");
    expect(result).toContain("text");
    expect(result).toContain("user"); // MessageType.getValue() returns lowercase
    // role name
    expect(result).toContain("Spring AI is interesting");
  });

  it("synthetic events are included in search", async () => {
    await sessionService.appendEvent(
      new SessionEvent({
        sessionId,
        message: UserMessage.of("Summarize the conversation we had so far."),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
        },
      }),
    );
    await sessionService.appendEvent(
      new SessionEvent({
        sessionId,
        message: AssistantMessage.of(
          "The user discussed Spring AI memory management.",
        ),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]: "test",
        },
      }),
    );

    // Synthetic summary text is searchable too
    const result = await search("memory management", 0);

    expect(result).toContain("memory management");
  });

  // --- helpers ---

  function search(query: string, page: number): Promise<string> {
    return tools.conversationSearch(
      { innerThought: "thinking...", query, page },
      toolContext(),
    );
  }

  function searchWithNullPage(query: string): Promise<string> {
    return tools.conversationSearch(
      { innerThought: "thinking...", query, page: null },
      toolContext(),
    );
  }

  function toolContext(): ToolContext {
    return new ToolContext({
      [SessionEventTools.SESSION_ID_CONTEXT_KEY]: sessionId,
    });
  }
});
