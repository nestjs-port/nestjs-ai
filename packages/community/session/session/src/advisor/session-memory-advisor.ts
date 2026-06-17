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
  Advisor,
  type AdvisorChain,
  BaseAdvisor,
  type ChatClientRequest,
  type ChatClientResponse,
  ChatClientMessageAggregator,
  type StreamAdvisorChain,
} from "@nestjs-ai/client-chat";
import { ChatMemory, type Message, SystemMessage } from "@nestjs-ai/model";
import { StringUtils } from "@nestjs-port/core";
import assert from "node:assert/strict";
import {
  type Observable,
  type SchedulerLike,
  mergeMap,
  observeOn,
  of,
} from "rxjs";
import type { CompactionStrategy } from "../compaction/compaction-strategy.js";
import type { CompactionTrigger } from "../compaction/compaction-trigger.js";
import { CreateSessionRequest } from "../create-session-request.js";
import { EventFilter } from "../event-filter.js";
import type { SessionService } from "../session-service.js";

/**
 * Parameters for constructing a {@link SessionMemoryAdvisor}.
 */
export interface SessionMemoryAdvisorProps {
  sessionService: SessionService;
  defaultUserId?: string;
  order?: number;
  scheduler?: SchedulerLike;
  /**
   * Filter applied when loading the session's event history to inject into the prompt.
   * Defaults to {@link EventFilter.all} (all events).
   */
  eventFilter?: EventFilter;
  compactionTrigger?: CompactionTrigger | null;
  compactionStrategy?: CompactionStrategy | null;
}

/**
 * A {@link BaseAdvisor} that manages conversation history using the {@link SessionService},
 * with optional context compaction.
 *
 * On each interaction:
 * 1. Retrieves the session's event history and prepends it to the prompt messages.
 * 2. Appends the current user message to the session.
 * 3. After the model responds, appends the assistant message to the session.
 * 4. Optionally triggers context compaction if the configured trigger fires.
 *
 * The session is identified by the {@link SessionMemoryAdvisor.SESSION_ID_CONTEXT_KEY}
 * value in the advisor context. The key must be present on every request; omitting it
 * throws to prevent accidental cross-user session sharing.
 *
 * **Concurrent compaction safety:** If two requests for the same session complete
 * concurrently, both `after()` calls may reach the compaction step simultaneously.
 * Compaction uses an optimistic compare-and-swap write via
 * {@link SessionRepository.replaceEvents}, so only the first writer succeeds; the second
 * detects the version mismatch and skips silently. No compaction result is lost or
 * corrupted.
 */
export class SessionMemoryAdvisor extends BaseAdvisor {
  /**
   * Context key used to pass the session ID into the advisor per-request. Equals
   * {@link ChatMemory.CONVERSATION_ID} so that this advisor uses the same context key as
   * the rest of the memory API.
   */
  static readonly SESSION_ID_CONTEXT_KEY = ChatMemory.CONVERSATION_ID;

  /**
   * Context key used to pass the user ID into the advisor per-request.
   */
  static readonly USER_ID_CONTEXT_KEY = "chat_memory_user_id";

  static readonly EVENT_FILTER_CONTEXT_KEY = "chat_memory_event_filter_id";

  private readonly _sessionService: SessionService;
  private readonly _defaultUserId: string;
  private readonly _order: number;
  private readonly _scheduler: SchedulerLike;
  private readonly _eventFilter: EventFilter;
  private readonly _compactionTrigger: CompactionTrigger | null;
  private readonly _compactionStrategy: CompactionStrategy | null;

  constructor({
    sessionService,
    defaultUserId = "default-user",
    // Higher precedence than default ToolCallingAdvisor: before() runs first, after()
    // runs last, so tool results are fully resolved before being written to session
    // history.
    order = Advisor.DEFAULT_CHAT_MEMORY_PRECEDENCE_ORDER,
    scheduler = BaseAdvisor.DEFAULT_SCHEDULER,
    eventFilter = EventFilter.all(),
    compactionTrigger = null,
    compactionStrategy = null,
  }: SessionMemoryAdvisorProps) {
    super();
    assert(sessionService != null, "sessionService must not be null");
    assert(eventFilter != null, "eventFilter must not be null");
    if ((compactionTrigger == null) !== (compactionStrategy == null)) {
      throw new Error(
        "compactionTrigger and compactionStrategy must be set together — set both or neither",
      );
    }
    this._sessionService = sessionService;
    this._defaultUserId = defaultUserId;
    this._order = order;
    this._scheduler = scheduler;
    this._eventFilter = eventFilter;
    this._compactionTrigger = compactionTrigger;
    this._compactionStrategy = compactionStrategy;
  }

  override get order(): number {
    return this._order;
  }

  override get scheduler(): SchedulerLike {
    return this._scheduler;
  }

  override async before(
    request: ChatClientRequest,
    _advisorChain: AdvisorChain,
  ): Promise<ChatClientRequest> {
    const context = request.context;

    // 0. Resolve the session ID — must be present in the request context.
    const sessionId = this.getSessionId(context);

    // 1. Find or create the session. The Session object is cached in the request
    // context so that after() can reuse it and skip a redundant findById()
    // repository round-trip when compaction is configured.
    let session = await this._sessionService.findById(sessionId);
    if (session == null) {
      const userId = this.getUserId(context);
      session = await this._sessionService.create(
        new CreateSessionRequest({ id: sessionId, userId }),
      );
    } else {
      // Enforce ownership when the caller explicitly identifies a user via
      // USER_ID_CONTEXT_KEY. Skipped when no per-request user ID is set so that
      // callers that rely solely on defaultUserId are not broken.
      const userIdValue = context.get(SessionMemoryAdvisor.USER_ID_CONTEXT_KEY);
      if (
        typeof userIdValue === "string" &&
        StringUtils.hasText(userIdValue) &&
        userIdValue !== session.userId
      ) {
        throw new Error(
          `Session '${sessionId}' does not belong to user '${userIdValue}'. Access denied.`,
        );
      }
    }

    // 2. Retrieve history applying the configured filter (default: all events)

    // If the request context contains an EventFilter, merge it with the advisor's
    // configured filter so that request-level parameters override the advisor
    // defaults
    let eventFilter = this._eventFilter;
    if (context.has(SessionMemoryAdvisor.EVENT_FILTER_CONTEXT_KEY)) {
      const requestEventFilter = context.get(
        SessionMemoryAdvisor.EVENT_FILTER_CONTEXT_KEY,
      ) as EventFilter | null;
      if (requestEventFilter != null) {
        eventFilter = this._eventFilter.merge(requestEventFilter);
      }
    }

    const events = await this._sessionService.getEvents(sessionId, eventFilter);
    const history = events.map((e) => e.message);

    let combined: Message[] = [...history, ...request.prompt.instructions];

    // 3. Ensure all system messages appear first (preserving their relative order).
    // A single pass collects every SystemMessage, removes them in place, then
    // prepends them as a block — so a system message buried in history and a
    // second one on the current request both end up at the front rather than
    // leaving the second one stranded mid-list.
    const systemMessages = combined.filter((m) => m instanceof SystemMessage);
    if (systemMessages.length > 0) {
      const others = combined.filter((m) => !(m instanceof SystemMessage));
      combined = [...systemMessages, ...others];
    }

    // 4. Append the current user message to the session
    const userMessage = request.prompt.lastUserOrToolResponseMessage;
    await this._sessionService.appendMessage(sessionId, userMessage);

    return request
      .mutate()
      .prompt(request.prompt.mutate().messages(combined).build())
      .build();
  }

  override async after(
    response: ChatClientResponse,
    _advisorChain: AdvisorChain,
  ): Promise<ChatClientResponse> {
    const sessionId = this.getSessionId(response.context);

    // 1. Append the assistant message(s) produced by the model
    if (response.chatResponse != null) {
      for (const generation of response.chatResponse.results) {
        await this._sessionService.appendMessage(sessionId, generation.output);
      }
    }

    // 2. Compact synchronously if configured — the full turn (user + assistant) is
    // already written at this point so there is no race.
    if (this._compactionTrigger != null && this._compactionStrategy != null) {
      await this._sessionService.compact(
        sessionId,
        this._compactionTrigger,
        this._compactionStrategy,
      );
    }

    return response;
  }

  override adviseStream(
    request: ChatClientRequest,
    streamAdvisorChain: StreamAdvisorChain,
  ): Observable<ChatClientResponse> {
    const scheduler = this.scheduler;

    const chatClientResponses = of(request).pipe(
      observeOn(scheduler),
      mergeMap((r) => this.before(r, streamAdvisorChain)),
      mergeMap((r) => streamAdvisorChain.nextStream(r)),
      // Re-pin to the scheduler so that the after() callback (which performs
      // synchronous session writes and optional compaction) always runs on the
      // configured scheduler rather than the LLM streaming thread.
      observeOn(scheduler),
    );

    return new ChatClientMessageAggregator().aggregateChatClientResponse(
      chatClientResponses,
      async (response) => {
        await this.after(response, streamAdvisorChain);
      },
    );
  }

  private getSessionId(context: Map<string, unknown>): string {
    const value = context.get(SessionMemoryAdvisor.SESSION_ID_CONTEXT_KEY);
    if (typeof value === "string" && StringUtils.hasText(value)) {
      return value;
    }
    throw new Error(
      "No session ID found in advisor context. " +
        "Set SESSION_ID_CONTEXT_KEY on every request: " +
        ".advisors(a => a.param(SessionMemoryAdvisor.SESSION_ID_CONTEXT_KEY, sessionId))",
    );
  }

  private getUserId(context: Map<string, unknown>): string {
    const value = context.get(SessionMemoryAdvisor.USER_ID_CONTEXT_KEY);
    return typeof value === "string" && StringUtils.hasText(value)
      ? value
      : this._defaultUserId;
  }
}
