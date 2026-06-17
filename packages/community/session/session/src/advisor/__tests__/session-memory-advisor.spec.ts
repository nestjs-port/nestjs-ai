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
  type AdvisorChain,
  ChatClientRequest,
  ChatClientResponse,
} from "@nestjs-ai/client-chat";
import {
  AssistantMessage,
  ChatResponse,
  Generation,
  Prompt,
  SystemMessage,
  UserMessage,
} from "@nestjs-ai/model";
import { beforeEach, describe, expect, it } from "vitest";
import { SessionMemoryAdvisor } from "../session-memory-advisor.js";
import { SlidingWindowCompactionStrategy } from "../../compaction/sliding-window-compaction-strategy.js";
import { TurnCountTrigger } from "../../compaction/turn-count-trigger.js";
import { CreateSessionRequest } from "../../create-session-request.js";
import { DefaultSessionService } from "../../default-session-service.js";
import { EventFilter } from "../../event-filter.js";
import { InMemorySessionRepository } from "../../in-memory-session-repository.js";
import { SessionEvent } from "../../session-event.js";
import type { SessionService } from "../../session-service.js";

/**
 * Integration tests for {@link SessionMemoryAdvisor}. No external LLM is required — the
 * advisor's `before()` and `after()` hooks are invoked directly to verify that the session
 * is populated correctly and that conversation history is re-injected into subsequent
 * prompts.
 */
describe("SessionMemoryAdvisor", () => {
  let sessionService: SessionService;
  let advisor: SessionMemoryAdvisor;
  let sessionId: string;

  // before()/after() ignore the advisor chain, so a bare stub is sufficient.
  const chain = {} as AdvisorChain;

  beforeEach(async () => {
    sessionService = new DefaultSessionService(new InMemorySessionRepository());
    advisor = new SessionMemoryAdvisor({ sessionService });

    const session = await sessionService.create(
      new CreateSessionRequest({ userId: "test-user" }),
    );
    sessionId = session.id;
  });

  // --- Before hook ---

  it("before appends user message to session", async () => {
    const request = buildRequest(sessionId, "Hello, what is Spring AI?");

    await advisor.before(request, chain);

    const events = await sessionService.getEvents(sessionId);
    expect(events).toHaveLength(1);
    expect(events[0].message.text).toBe("Hello, what is Spring AI?");
    expect(events[0].messageType.getValue()).toBe("user");
  });

  it("before injects existing history into prompt messages", async () => {
    // Pre-populate the session with a prior turn
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("What is Spring?"),
    );
    await sessionService.appendMessage(
      sessionId,
      AssistantMessage.of("Spring is a framework."),
    );

    const request = buildRequest(sessionId, "Tell me more about Spring AI.");

    const modified = await advisor.before(request, chain);

    // The modified prompt must include the history + the new user message
    const combined = modified.prompt.instructions;
    expect(combined.length).toBeGreaterThanOrEqual(3);
    expect(combined[0].text).toBe("What is Spring?");
    expect(combined[1].text).toBe("Spring is a framework.");
    expect(combined[combined.length - 1].text).toBe(
      "Tell me more about Spring AI.",
    );
  });

  it("before throws when session id context key absent", async () => {
    const prompt = new Prompt([UserMessage.of("hello")]);
    const request = new ChatClientRequest(prompt, new Map());

    await expect(advisor.before(request, chain)).rejects.toThrow(
      "SESSION_ID_CONTEXT_KEY",
    );
  });

  // --- After hook ---

  it("after appends assistant message to session", async () => {
    // Simulate before() having appended the user message
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("What is Spring AI?"),
    );

    const response = buildResponse(
      sessionId,
      "Spring AI is a framework for AI apps.",
    );

    await advisor.after(response, chain);

    const events = await sessionService.getEvents(sessionId);
    expect(events).toHaveLength(2);
    expect(events[1].message.text).toBe(
      "Spring AI is a framework for AI apps.",
    );
    expect(events[1].messageType.getValue()).toBe("assistant");
  });

  // --- Full round-trip ---

  it("multi turn conversation builds up history", async () => {
    // Turn 1
    const req1 = buildRequest(sessionId, "What is Spring AI?");
    await advisor.before(req1, chain);
    await advisor.after(
      buildResponse(sessionId, "Spring AI is an AI framework."),
      chain,
    );

    // Turn 2
    const req2 = buildRequest(sessionId, "How do I use it?");
    const modified2 = await advisor.before(req2, chain);
    await advisor.after(buildResponse(sessionId, "Use ChatClient."), chain);

    // After turn 2's before(), history from turn 1 should be in the prompt
    const instructions = modified2.prompt.instructions;
    expect(instructions.length).toBeGreaterThanOrEqual(3);
    expect(instructions[0].text).toBe("What is Spring AI?");
    expect(instructions[1].text).toBe("Spring AI is an AI framework.");

    // Session should now have 4 events total
    const events = await sessionService.getEvents(sessionId);
    expect(events).toHaveLength(4);
  });

  it("compaction is triggered after threshold", async () => {
    // Wire advisor with a very low compaction threshold (1 turn) and small window
    const compactingAdvisor = new SessionMemoryAdvisor({
      sessionService,
      compactionTrigger: new TurnCountTrigger(2),
      compactionStrategy: new SlidingWindowCompactionStrategy({ maxEvents: 2 }),
    });

    // Append 3 complete turns (user + assistant each)
    for (let i = 1; i <= 3; i++) {
      await compactingAdvisor.before(
        buildRequest(sessionId, `question ${i}`),
        chain,
      );
      await compactingAdvisor.after(
        buildResponse(sessionId, `answer ${i}`),
        chain,
      );
    }

    // Compaction runs synchronously after each turn, so by the time we get here
    // the sliding window (maxEvents=2) has already been applied.
    const events = await sessionService.getEvents(sessionId);
    expect(events.length).toBeLessThanOrEqual(2);
  });

  it("before promotes all system messages to front", async () => {
    // Simulate a session whose history already contains a system message (e.g. from
    // a previous turn that was stored), plus the current request also carries one.
    await sessionService.appendMessage(
      sessionId,
      SystemMessage.of("You are a helpful assistant."),
    );
    await sessionService.appendMessage(sessionId, UserMessage.of("Hello"));
    await sessionService.appendMessage(sessionId, AssistantMessage.of("Hi!"));

    // Current request has its own system message
    const prompt = new Prompt([
      SystemMessage.of("Always reply in English."),
      UserMessage.of("How are you?"),
    ]);
    const request = new ChatClientRequest(
      prompt,
      new Map([[SessionMemoryAdvisor.SESSION_ID_CONTEXT_KEY, sessionId]]),
    );

    const modified = await advisor.before(request, chain);

    const instructions = modified.prompt.instructions;

    // Both system messages must be at the front — neither stranded mid-list
    expect(instructions[0]).toBeInstanceOf(SystemMessage);
    expect(instructions[1]).toBeInstanceOf(SystemMessage);
    // Non-system messages follow
    for (const m of instructions.slice(2)) {
      expect(m).not.toBeInstanceOf(SystemMessage);
    }
  });

  // --- Ownership enforcement ---

  it("before allows access when user id matches session owner", async () => {
    // Session was created with userId "test-user" in beforeEach.
    // A request that carries the same user ID must succeed.
    const request = buildRequestWithUserId(sessionId, "hello", "test-user");

    // Must not throw
    await advisor.before(request, chain);
  });

  it("before denies access when user id does not match session owner", async () => {
    // Session belongs to "test-user". A different user must be rejected.
    const request = buildRequestWithUserId(sessionId, "hello", "other-user");

    await expect(advisor.before(request, chain)).rejects.toThrow(
      "does not belong to user",
    );
  });

  it("before skips ownership check when no user id in context", async () => {
    // Backward-compat: callers that don't set USER_ID_CONTEXT_KEY must still be able
    // to access existing sessions.
    const request = buildRequest(sessionId, "hello");

    // Must not throw even though session.userId is "test-user"
    await advisor.before(request, chain);
  });

  // --- historyFilter ---

  it("history filter excludes sibling branch events", async () => {
    // Root event (null branch) + orch.writer event (sibling branch) +
    // orch.researcher event (target branch).
    // An advisor configured for orch.researcher must see root + orch.researcher
    // events only; orch.writer events must be excluded from the injected history.
    await sessionService.appendEvent(
      new SessionEvent({
        sessionId,
        message: UserMessage.of("root question"),
      }),
    ); // null branch
    await sessionService.appendEvent(
      new SessionEvent({
        sessionId,
        message: AssistantMessage.of("writer output"),
        branch: "orch.writer",
      }),
    );
    await sessionService.appendEvent(
      new SessionEvent({
        sessionId,
        message: AssistantMessage.of("researcher output"),
        branch: "orch.researcher",
      }),
    );

    const branchAdvisor = new SessionMemoryAdvisor({
      sessionService,
      eventFilter: EventFilter.forBranch("orch.researcher"),
    });

    const request = buildRequest(sessionId, "follow-up");

    const modified = await branchAdvisor.before(request, chain);

    const instructions = modified.prompt.instructions;
    const texts = instructions.map((m) => m.text);

    expect(texts).toContain("root question");
    expect(texts).toContain("researcher output");
    expect(texts).not.toContain("writer output");
  });

  // --- Per-request EventFilter override ---

  it("request event filter overrides advisor default", async () => {
    // Populate 4 messages
    await sessionService.appendMessage(sessionId, UserMessage.of("msg1"));
    await sessionService.appendMessage(
      sessionId,
      AssistantMessage.of("reply1"),
    );
    await sessionService.appendMessage(sessionId, UserMessage.of("msg2"));
    await sessionService.appendMessage(
      sessionId,
      AssistantMessage.of("reply2"),
    );

    // Advisor has no filter (all), but request narrows to lastN=2
    const prompt = new Prompt([UserMessage.of("new question")]);
    const request = new ChatClientRequest(
      prompt,
      new Map<string, unknown>([
        [SessionMemoryAdvisor.SESSION_ID_CONTEXT_KEY, sessionId],
        [SessionMemoryAdvisor.EVENT_FILTER_CONTEXT_KEY, EventFilter.lastN(2)],
      ]),
    );

    const modified = await advisor.before(request, chain);

    const texts = modified.prompt.instructions.map((m) => m.text);
    expect(texts).toContain("msg2");
    expect(texts).toContain("reply2");
    expect(texts).not.toContain("msg1");
    expect(texts).not.toContain("reply1");
  });

  it("null request event filter is ignored and advisor default is used", async () => {
    await sessionService.appendMessage(
      sessionId,
      UserMessage.of("only message"),
    );

    const prompt = new Prompt([UserMessage.of("follow-up")]);
    const request = new ChatClientRequest(
      prompt,
      new Map<string, unknown>([
        [SessionMemoryAdvisor.SESSION_ID_CONTEXT_KEY, sessionId],
        [SessionMemoryAdvisor.EVENT_FILTER_CONTEXT_KEY, null],
      ]),
    );

    const modified = await advisor.before(request, chain);

    const texts = modified.prompt.instructions.map((m) => m.text);
    expect(texts).toContain("only message");
  });

  // --- Builder validation ---

  it("builder rejects only trigger without strategy", () => {
    expect(
      () =>
        new SessionMemoryAdvisor({
          sessionService,
          compactionTrigger: new TurnCountTrigger(5),
        }),
    ).toThrow("compactionTrigger and compactionStrategy must be set together");
  });

  it("builder rejects only strategy without trigger", () => {
    expect(
      () =>
        new SessionMemoryAdvisor({
          sessionService,
          compactionStrategy: new SlidingWindowCompactionStrategy({
            maxEvents: 5,
          }),
        }),
    ).toThrow("compactionTrigger and compactionStrategy must be set together");
  });

  // --- Helpers ---

  function buildRequest(id: string, userText: string): ChatClientRequest {
    const prompt = new Prompt([UserMessage.of(userText)]);
    return new ChatClientRequest(
      prompt,
      new Map([[SessionMemoryAdvisor.SESSION_ID_CONTEXT_KEY, id]]),
    );
  }

  function buildRequestWithUserId(
    id: string,
    userText: string,
    userId: string,
  ): ChatClientRequest {
    const prompt = new Prompt([UserMessage.of(userText)]);
    return new ChatClientRequest(
      prompt,
      new Map([
        [SessionMemoryAdvisor.SESSION_ID_CONTEXT_KEY, id],
        [SessionMemoryAdvisor.USER_ID_CONTEXT_KEY, userId],
      ]),
    );
  }

  function buildResponse(
    id: string,
    assistantText: string,
  ): ChatClientResponse {
    const chatResponse = new ChatResponse({
      generations: [
        new Generation({
          assistantMessage: AssistantMessage.of(assistantText),
        }),
      ],
    });
    return new ChatClientResponse(
      chatResponse,
      new Map([[SessionMemoryAdvisor.SESSION_ID_CONTEXT_KEY, id]]),
    );
  }
});
