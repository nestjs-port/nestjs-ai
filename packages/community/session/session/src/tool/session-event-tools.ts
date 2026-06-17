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

import { Tool, type ToolContext } from "@nestjs-ai/model";
import { type Logger, LoggerFactory, StringUtils } from "@nestjs-port/core";
import assert from "node:assert/strict";
import { z } from "zod";
import { EventFilter } from "../event-filter.js";
import type { SessionService } from "../session-service.js";

const CONVERSATION_SEARCH_PARAMETERS = z.object({
  innerThought: z
    .string()
    .describe("Deep inner monologue private to you only."),
  query: z
    .string()
    .describe("Keyword to search for in the conversation history."),
  page: z
    .number()
    .int()
    .nullish()
    .describe(
      "Page of results to retrieve (0-indexed). Omit or use 0 for the first page.",
    ),
});

type ConversationSearchInput = z.infer<typeof CONVERSATION_SEARCH_PARAMETERS>;

/**
 * Parameters for constructing {@link SessionEventTools}.
 */
export interface SessionEventToolsProps {
  /** The session service to search. */
  sessionService: SessionService;
  /**
   * Number of results returned per page by `conversation_search`. Defaults to
   * {@link EventFilter.DEFAULT_PAGE_SIZE}. Must be positive.
   */
  pageSize?: number;
}

/**
 * Agent-facing tools for searching the session's conversation history (Recall Storage).
 *
 * Mirrors the MemGPT `conversation_search` tool: the full verbatim history is retained in
 * the session event log and is always searchable by keyword, even after context compaction
 * has pruned older events from the active context window.
 *
 * The session to search is resolved from {@link ToolContext} using
 * {@link SessionEventTools.SESSION_ID_CONTEXT_KEY} (equals the chat memory conversation
 * id), which is the same key written into the context by `SessionMemoryAdvisor`. Register
 * an instance of this class as a tool on the `ChatClient` alongside the advisor.
 */
export class SessionEventTools {
  private readonly logger: Logger = LoggerFactory.getLogger(
    SessionEventTools.name,
  );

  /**
   * Context key used to resolve the session ID from {@link ToolContext}. Must match
   * `SessionMemoryAdvisor.SESSION_ID_CONTEXT_KEY`.
   */
  static readonly SESSION_ID_CONTEXT_KEY = "chat_memory_conversation_id";

  private readonly _sessionService: SessionService;
  private readonly _pageSize: number;

  constructor(props: SessionEventToolsProps) {
    assert(props.sessionService != null, "sessionService must not be null");
    const pageSize = props.pageSize ?? EventFilter.DEFAULT_PAGE_SIZE;
    assert(pageSize > 0, "pageSize must be positive");
    this._sessionService = props.sessionService;
    this._pageSize = pageSize;
  }

  /**
   * Searches the current session's conversation history for events whose message text
   * contains the given keyword (case-insensitive). Supports pagination for large
   * histories.
   *
   * Results are returned in chronological order as a JSON array. Each entry contains:
   * - `timestamp` — ISO-8601 instant the event was recorded
   * - `type` — message role (`USER`, `ASSISTANT`, `TOOL`)
   * - `text` — verbatim message text
   *
   * @returns JSON array of matching events, or `"No results found."` if empty
   */
  @Tool({
    name: "conversation_search",
    description:
      "Search the full prior conversation history using case-insensitive keyword matching. " +
      "Returns paginated results ordered chronologically.",
    parameters: CONVERSATION_SEARCH_PARAMETERS,
    returns: z.string(),
  })
  async conversationSearch(
    input: ConversationSearchInput,
    toolContext: ToolContext,
  ): Promise<string> {
    const pageNumber = input.page != null ? Math.max(0, input.page) : 0;

    this.logger.debug(
      `[conversation_search] innerThought: ${input.innerThought}, query: ${input.query}, page: ${pageNumber}`,
    );

    const sessionIdValue =
      toolContext.context[SessionEventTools.SESSION_ID_CONTEXT_KEY];
    let sessionId: string;
    if (
      typeof sessionIdValue === "string" &&
      StringUtils.hasText(sessionIdValue)
    ) {
      sessionId = sessionIdValue;
    } else {
      sessionId = "default";
      this.logger.warn(
        `[conversation_search] '${SessionEventTools.SESSION_ID_CONTEXT_KEY}' not found in ToolContext — falling back to session ID 'default'. ` +
          "Register SessionMemoryAdvisor alongside this tool so the correct session ID is propagated.",
      );
    }

    const events = await this._sessionService.getEvents(
      sessionId,
      EventFilter.keywordSearch(input.query, pageNumber, this._pageSize),
    );

    const results = events
      .filter((e) => StringUtils.hasText(e.message.text))
      .map((e) => ({
        timestamp: e.timestamp.toISOString(),
        type: e.messageType.getValue(),
        text: e.message.text,
      }));

    if (results.length === 0) {
      return "No results found.";
    }

    return JSON.stringify(results);
  }
}
