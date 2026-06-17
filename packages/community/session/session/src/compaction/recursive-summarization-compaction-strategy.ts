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
  TiktokenTokenCountEstimator,
  type TokenCountEstimator,
} from "@nestjs-ai/commons";
import type { ChatClient } from "@nestjs-ai/client-chat";
import { AssistantMessage, MessageType, UserMessage } from "@nestjs-ai/model";
import { type Logger, LoggerFactory, StringUtils } from "@nestjs-port/core";
import assert from "node:assert/strict";
import type { CompactionRequest } from "./compaction-request.js";
import { CompactionResult } from "./compaction-result.js";
import type { CompactionStrategy } from "./compaction-strategy.js";
import { CompactionUtils } from "./compaction-utils.js";
import { SessionEvent } from "../session-event.js";

/**
 * Parameters for constructing a {@link RecursiveSummarizationCompactionStrategy}.
 */
export interface RecursiveSummarizationCompactionStrategyProps {
  /** Chat client used to generate the rolling summary. Required. */
  chatClient: ChatClient;
  /** Number of recent real events kept in full after compaction. */
  maxEventsToKeep?: number;
  /** Number of active-window events fed into the summary prompt for continuity. */
  overlapSize?: number;
  /** System prompt sent to the summarization LLM. */
  systemPrompt?: string;
  /** Synthetic `USER` message that opens each summary turn (the "shadow prompt"). */
  shadowPrompt?: string;
  /** Estimator used to calculate `tokensEstimatedSaved`. */
  tokenCountEstimator?: TokenCountEstimator;
  /** Optional callback invoked when the LLM returns a null or blank summary. */
  onSummarizationFailure?: (request: CompactionRequest) => void;
  /** Function used to render a {@link SessionEvent} as a line of text. */
  eventFormatter?: (event: SessionEvent) => string;
}

/**
 * LLM-powered compaction strategy that summarizes older conversation events into a
 * synthetic user+assistant turn using a sliding-window approach.
 *
 * ## Algorithm
 * 1. Separate synthetic summary events from real conversation events.
 * 2. Keep the last `maxEventsToKeep` real events intact (the _active window_), snapping the
 *    cut point back to the nearest turn boundary so a partial turn is never kept.
 * 3. Everything before the active window — plus any prior synthetic summaries — forms the
 *    _events to summarize_.
 * 4. An LLM call condenses them into a rolling summary, optionally including the last
 *    `overlapSize` events from the active window for continuity.
 * 5. The result is placed as a _synthetic summary turn_: a pair of synthetic events
 *    [`USER` shadow prompt, `ASSISTANT` summary] followed by the active window. This
 *    mirrors the OpenAI Agents SDK approach and ensures the conversation always has a
 *    coherent user↔assistant alternation.
 *
 * ## Recursive / rolling behaviour
 * Any prior synthetic summary produced by a previous compaction pass is fed back to the
 * LLM as context when generating the new summary. This means each summary _builds on_ its
 * predecessors rather than starting from scratch, creating a rolling window of compressed
 * context.
 *
 * ## No-op condition
 * If the number of root (non-branch) real events does not exceed `maxEventsToKeep` no LLM
 * call is made and the events are returned unchanged.
 */
export class RecursiveSummarizationCompactionStrategy implements CompactionStrategy {
  private static readonly logger: Logger = LoggerFactory.getLogger(
    RecursiveSummarizationCompactionStrategy.name,
  );

  /** Default number of recent real events preserved after compaction. */
  static readonly DEFAULT_MAX_EVENTS_TO_KEEP = 10;

  /**
   * Default number of active-window events fed into the summary prompt for continuity.
   */
  static readonly DEFAULT_OVERLAP_SIZE = 2;

  private static readonly STRATEGY_NAME = "recursive-summarization";

  /**
   * The synthetic user message that opens each summary turn, modelled after the OpenAI
   * Agents SDK shadow-prompt pattern.
   */
  static readonly DEFAULT_SUMMARY_SHADOW_PROMPT =
    "Summarize the conversation we had so far.";

  private static readonly DEFAULT_SYSTEM_PROMPT = `You are a conversation summarizer. Your task is to create a concise summary of the conversation history provided. The summary will replace the original events in the context window and must preserve all key information needed to continue the conversation coherently.

Guidelines:
- Preserve key facts, decisions, user preferences, and important outcomes.
- Note any unresolved questions or pending actions.
- Write in third-person narrative ("The user asked...", "The assistant explained...").
- Be concise but complete. Omit filler and repetition.
- If a prior summary is provided, incorporate it naturally — do not repeat it verbatim.
`;

  private readonly _chatClient: ChatClient;
  private readonly _maxEventsToKeep: number;
  private readonly _overlapSize: number;
  private readonly _systemPrompt: string;
  private readonly _shadowPrompt: string;
  private readonly _tokenCountEstimator: TokenCountEstimator;
  private readonly _onSummarizationFailure:
    | ((request: CompactionRequest) => void)
    | null;
  private readonly _eventFormatter: (event: SessionEvent) => string;

  constructor(props: RecursiveSummarizationCompactionStrategyProps) {
    const chatClient = props.chatClient;
    const maxEventsToKeep =
      props.maxEventsToKeep ??
      RecursiveSummarizationCompactionStrategy.DEFAULT_MAX_EVENTS_TO_KEEP;
    const overlapSize =
      props.overlapSize ??
      RecursiveSummarizationCompactionStrategy.DEFAULT_OVERLAP_SIZE;
    const systemPrompt =
      props.systemPrompt ??
      RecursiveSummarizationCompactionStrategy.DEFAULT_SYSTEM_PROMPT;
    const shadowPrompt =
      props.shadowPrompt ??
      RecursiveSummarizationCompactionStrategy.DEFAULT_SUMMARY_SHADOW_PROMPT;
    const tokenCountEstimator =
      props.tokenCountEstimator ?? new TiktokenTokenCountEstimator();
    const eventFormatter =
      props.eventFormatter ??
      RecursiveSummarizationCompactionStrategy.formatEvent;

    assert(chatClient != null, "chatClient must not be null");
    assert(maxEventsToKeep > 0, "maxEventsToKeep must be greater than 0");
    assert(overlapSize >= 0, "overlapSize must be >= 0");
    assert(
      overlapSize < maxEventsToKeep,
      "overlapSize must be less than maxEventsToKeep",
    );
    assert(StringUtils.hasText(systemPrompt), "systemPrompt must not be empty");
    assert(StringUtils.hasText(shadowPrompt), "shadowPrompt must not be empty");
    assert(tokenCountEstimator != null, "tokenCountEstimator must not be null");
    assert(eventFormatter != null, "eventFormatter must not be null");

    this._chatClient = chatClient;
    this._maxEventsToKeep = maxEventsToKeep;
    this._overlapSize = overlapSize;
    this._systemPrompt = systemPrompt;
    this._shadowPrompt = shadowPrompt;
    this._tokenCountEstimator = tokenCountEstimator;
    this._onSummarizationFailure = props.onSummarizationFailure ?? null;
    this._eventFormatter = eventFormatter;
  }

  async compact(context: CompactionRequest): Promise<CompactionResult> {
    assert(context != null, "context must not be null");
    assert(context.session != null, "session must not be null");

    const events = context.events;

    const syntheticEvents = events.filter((e) => e.isSynthetic());
    const realEvents = events.filter((e) => !e.isSynthetic());

    // Count only root (non-branch) real events. Branch events from sub-agent sessions
    // are bundled with their enclosing root turns and do not consume slots from the
    // maxEventsToKeep budget.
    const rootEventCount = realEvents.filter((e) => e.isRootEvent()).length;

    if (rootEventCount <= this._maxEventsToKeep) {
      // Nothing to compact — return as-is
      return new CompactionResult({
        compactedEvents: events,
        archivedEvents: [],
        tokensEstimatedSaved: 0,
      });
    }

    // Find the index in realEvents just after the last root event to archive.
    const rootEventsToArchive = rootEventCount - this._maxEventsToKeep;
    let rawCutIndex = 0;
    let rootSeen = 0;
    for (let i = 0; i < realEvents.length; i++) {
      if (realEvents[i].isRootEvent()) {
        rootSeen++;
        if (rootSeen === rootEventsToArchive) {
          rawCutIndex = i + 1;
          break;
        }
      }
    }

    // Snap forward to the nearest root-level turn start (USER message) so the active
    // window always begins at a turn boundary and is never a partial turn.
    // Sub-agent USER messages (branch != null) are skipped — they are turn-internal.
    const cutIndex = CompactionUtils.snapToTurnStart(realEvents, rawCutIndex);

    // Split real events: archive the older ones, keep the newest window
    const toArchive = realEvents.slice(0, cutIndex);
    const activeWindow = realEvents.slice(cutIndex);

    // Overlap: the first `overlapSize` events from the active window are also fed
    // into the summary prompt so the LLM has continuity context
    const overlapEvents = activeWindow.slice(
      0,
      Math.min(this._overlapSize, activeWindow.length),
    );

    // Build the user prompt for the LLM
    const userPrompt = this.buildSummarizationPrompt(
      syntheticEvents,
      toArchive,
      overlapEvents,
    );

    // Call the LLM
    const summary = await this._chatClient
      .prompt()
      .system(this._systemPrompt)
      .user(userPrompt)
      .call()
      .content();

    if (summary == null || !StringUtils.hasText(summary)) {
      RecursiveSummarizationCompactionStrategy.logger.warn(
        `RecursiveSummarizationCompactionStrategy: LLM returned a null or blank summary for session '${context.session.id}'. Compaction skipped — event history is unchanged.`,
      );
      if (this._onSummarizationFailure != null) {
        this._onSummarizationFailure(context);
      }
      return new CompactionResult({
        compactedEvents: events,
        archivedEvents: [],
        tokensEstimatedSaved: 0,
      });
    }

    // Build the compacted event list: synthetic summary turn (user + assistant) +
    // active window. The two-event turn mirrors the OpenAI Agents SDK shadow-prompt
    // pattern so the model always sees a coherent user↔assistant alternation.
    // Both events share the same timestamp so they are treated as an atomic pair.
    const sessionId = context.session.id;
    const now = new Date();
    const summaryTurn = [
      new SessionEvent({
        sessionId,
        timestamp: now,
        message: UserMessage.of(this._shadowPrompt),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]:
            RecursiveSummarizationCompactionStrategy.STRATEGY_NAME,
        },
      }),
      new SessionEvent({
        sessionId,
        timestamp: now,
        message: AssistantMessage.of(summary),
        metadata: {
          [SessionEvent.METADATA_SYNTHETIC]: true,
          [SessionEvent.METADATA_COMPACTION_SOURCE]:
            RecursiveSummarizationCompactionStrategy.STRATEGY_NAME,
        },
      }),
    ];

    const compacted = [...summaryTurn, ...activeWindow];

    // Archived = only the real events that were summarized and removed.
    // Prior synthetic summaries are implicitly replaced by the new summaryTurn above
    // and are therefore NOT included in archivedEvents. This keeps the semantics of
    // archivedEvents consistent with the other strategies, which only report the real
    // events they removed from the session.
    const archived = [...toArchive];

    const tokensArchived = toArchive.reduce(
      (sum, e) =>
        sum + this._tokenCountEstimator.estimate(this._eventFormatter(e)),
      0,
    );

    return new CompactionResult({
      compactedEvents: compacted,
      archivedEvents: archived,
      tokensEstimatedSaved: tokensArchived,
    });
  }

  /**
   * Builds the user-facing summarization prompt. Includes:
   * 1. Any prior synthetic summary (recursive context).
   * 2. The events to be archived (the content to summarize).
   * 3. The overlap events from the active window (for continuity).
   */
  private buildSummarizationPrompt(
    priorSummaries: SessionEvent[],
    eventsToSummarize: SessionEvent[],
    overlapEvents: SessionEvent[],
  ): string {
    let prompt = "";

    if (priorSummaries.length > 0) {
      prompt += "=== PRIOR SUMMARY ===\n";
      // Exclude synthetic USER shadow prompts — they are structural placeholders,
      // not summary content. Include only ASSISTANT (and legacy SYSTEM) events
      // whose text carries the actual compressed history.
      for (const e of priorSummaries.filter(
        (e) => e.messageType !== MessageType.USER,
      )) {
        prompt += `${e.message.text}\n`;
      }
      prompt += "\n";
    }

    prompt += "=== CONVERSATION TO SUMMARIZE ===\n";
    for (const e of eventsToSummarize) {
      prompt += `${this._eventFormatter(e)}\n`;
    }

    if (overlapEvents.length > 0) {
      prompt +=
        "\n=== UPCOMING CONTEXT (do not summarize — for continuity only) ===\n";
      for (const e of overlapEvents) {
        prompt += `${this._eventFormatter(e)}\n`;
      }
    }

    prompt += "\nPlease write the summary now:";
    return prompt;
  }

  static formatEvent(event: SessionEvent): string {
    return CompactionUtils.formatEvent(event);
  }
}
