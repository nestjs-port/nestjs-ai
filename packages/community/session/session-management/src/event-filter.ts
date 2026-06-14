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

import type { MessageType } from "@nestjs-ai/model";
import type { SessionEvent } from "./session-event.js";

/**
 * Criteria for filtering {@link SessionEvent}s when retrieving session history.
 *
 * Filters are composable: all non-null criteria must match for an event to be included.
 * {@link lastN} and {@link page}/{@link pageSize} are post-match retrieval modifiers
 * applied after per-event matching.
 *
 * **Retrieval modifier contract:**
 * - {@link lastN} and {@link pageSize} are _mutually exclusive_; setting both throws.
 * - If {@link pageSize} is set and {@link page} is `null`, {@link page} defaults to `0`
 *   (first page).
 * - Setting {@link page} without {@link pageSize} throws.
 * - {@link lastN} must be greater than zero if set.
 * - {@link pageSize} must be greater than zero if set.
 * - {@link page} must be non-negative if set.
 * - Paginated results are sliced from the per-event-filtered list in _chronological
 *   order_ (oldest first). Page 0 therefore contains the oldest matching events, and the
 *   highest-numbered page contains the most recent ones.
 *
 * Branch filtering implements the MemGPT / Google ADK isolation rule for multi-agent
 * sessions: an event at branch `X` is visible to an agent at branch `Y` if `X` is `null`
 * (a root event), equals `Y`, or is a dot-prefix ancestor of `Y` (e.g. `"orch"` is an
 * ancestor of `"orch.researcher"`).
 *
 * Use the static factory methods for common cases or {@link builder} for custom
 * combinations:
 *
 * ```ts
 * const filter = EventFilter.builder()
 *   .from(new Date("2025-01-01T00:00:00Z"))
 *   .messageTypes(new Set([MessageType.USER, MessageType.ASSISTANT]))
 *   .excludeSynthetic(true)
 *   .branch("orch.researcher")
 *   .build();
 * ```
 */
export class EventFilter {
  /** Default number of results per page used by {@link keywordSearch}. */
  static readonly DEFAULT_PAGE_SIZE = 10;

  private readonly _from: Date | null;
  private readonly _to: Date | null;
  private readonly _messageTypes: Set<MessageType> | null;
  private readonly _excludeSynthetic: boolean;
  private readonly _lastN: number | null;
  private readonly _keyword: string | null;
  private readonly _page: number | null;
  private readonly _pageSize: number | null;
  private readonly _branch: string | null;

  constructor(builder: EventFilterBuilder) {
    let keyword = builder.keywordValue;
    let messageTypes = builder.messageTypesValue;
    let page = builder.pageValue;
    const pageSize = builder.pageSizeValue;
    const lastN = builder.lastNValue;

    keyword =
      keyword != null && keyword.trim().length > 0
        ? keyword.toLowerCase()
        : null;
    messageTypes =
      messageTypes != null && messageTypes.size > 0 ? messageTypes : null;
    if (lastN != null && lastN <= 0) {
      throw new Error("lastN must be greater than 0");
    }
    if (lastN != null && pageSize != null) {
      throw new Error("lastN and page/pageSize are mutually exclusive");
    }
    if (pageSize != null && pageSize <= 0) {
      throw new Error("pageSize must be greater than 0");
    }
    if (page != null && page < 0) {
      throw new Error("page must be >= 0");
    }
    if (page != null && pageSize == null) {
      throw new Error("pageSize must be set when page is set");
    }
    if (pageSize != null && page == null) {
      page = 0;
    }

    this._from = builder.fromValue;
    this._to = builder.toValue;
    this._messageTypes = messageTypes;
    this._excludeSynthetic = builder.excludeSyntheticValue;
    this._lastN = lastN;
    this._keyword = keyword;
    this._page = page;
    this._pageSize = pageSize;
    this._branch = builder.branchValue;
  }

  get from(): Date | null {
    return this._from;
  }

  get to(): Date | null {
    return this._to;
  }

  get messageTypes(): Set<MessageType> | null {
    return this._messageTypes;
  }

  get excludeSynthetic(): boolean {
    return this._excludeSynthetic;
  }

  get lastN(): number | null {
    return this._lastN;
  }

  get keyword(): string | null {
    return this._keyword;
  }

  get page(): number | null {
    return this._page;
  }

  get pageSize(): number | null {
    return this._pageSize;
  }

  get branch(): string | null {
    return this._branch;
  }

  merge(other: EventFilter): EventFilter {
    return EventFilter.builder()
      .from(other._from ?? this._from)
      .to(other._to ?? this._to)
      .messageTypes(other._messageTypes ?? this._messageTypes)
      .excludeSynthetic(other._excludeSynthetic || this._excludeSynthetic)
      .lastN(other._lastN ?? this._lastN)
      .keyword(other._keyword ?? this._keyword)
      .page(other._page ?? this._page)
      .pageSize(other._pageSize ?? this._pageSize)
      .branch(other._branch ?? this._branch)
      .build();
  }

  /** Returns all events with no filtering. */
  static all(): EventFilter {
    return EventFilter.builder().build();
  }

  /** Returns the last `n` events. */
  static lastN(n: number): EventFilter {
    return EventFilter.builder().lastN(n).build();
  }

  /** Excludes synthetic (framework-generated) events such as compaction summaries. */
  static realOnly(): EventFilter {
    return EventFilter.builder().excludeSynthetic(true).build();
  }

  /**
   * Returns a page of events whose message text contains `keyword` (case-insensitive
   * substring match). Defaults to the first page using {@link DEFAULT_PAGE_SIZE}.
   * @param keyword the search term
   * @param page zero-indexed page number
   * @param pageSize number of results per page
   */
  static keywordSearch(
    keyword: string,
    page = 0,
    pageSize: number = EventFilter.DEFAULT_PAGE_SIZE,
  ): EventFilter {
    return EventFilter.builder()
      .keyword(keyword)
      .page(page)
      .pageSize(pageSize)
      .build();
  }

  /**
   * Returns events that are visible to an agent at the given `agentBranch`.
   *
   * An event is included if its branch is:
   * - `null` — a root event produced before any delegation, visible to all agents
   * - equal to `agentBranch` — the agent's own events
   * - a dot-prefix ancestor of `agentBranch` — events from a parent agent (e.g. event
   *   branch `"orch"` is visible to `"orch.researcher"`)
   *
   * Peer sub-agents (e.g. `"orch.writer"` vs `"orch.researcher"`) never see each other's
   * events.
   * @param agentBranch the dot-separated branch path of the querying agent (e.g.
   * `"orchestrator.researcher"`)
   */
  static forBranch(agentBranch: string): EventFilter {
    return EventFilter.builder().branch(agentBranch).build();
  }

  /** Returns a new {@link EventFilterBuilder} for constructing a custom {@link EventFilter}. */
  static builder(): EventFilterBuilder {
    return new EventFilterBuilder();
  }

  // Per-event predicate

  /**
   * Returns `true` if the given event passes all per-event criteria in this filter. Note:
   * {@link lastN}, {@link page}, and {@link pageSize} are applied at the collection level
   * by the repository, not here.
   */
  matches(event: SessionEvent): boolean {
    if (this._excludeSynthetic && event.isSynthetic()) {
      return false;
    }
    if (this._from != null && event.timestamp < this._from) {
      return false;
    }
    if (this._to != null && event.timestamp > this._to) {
      return false;
    }
    if (
      this._messageTypes != null &&
      !this._messageTypes.has(event.messageType)
    ) {
      return false;
    }
    if (this._keyword != null) {
      const text = event.message.text;
      if (text == null || !text.toLowerCase().includes(this._keyword)) {
        return false;
      }
    }
    if (this._branch != null) {
      const eventBranch = event.branch;
      if (eventBranch != null) {
        // eventBranch is visible to filterBranch if it is the same branch or an
        // ancestor (i.e. filterBranch starts with eventBranch + ".")
        // TODO: what convention to use for branching trees (. or / or something
        // else)? Should we support wildcards (e.g. "orch.*")?
        // TODO: Should we support rootEventId for branch?
        const visible =
          this._branch === eventBranch ||
          this._branch.startsWith(`${eventBranch}.`);
        if (!visible) {
          return false;
        }
      }
      // eventBranch == null: root event, visible to all agents
    }
    return true;
  }
}

/**
 * Builder for {@link EventFilter}. All fields default to `null` / `false`, producing a
 * filter equivalent to {@link EventFilter.all} when no setters are called.
 */
export class EventFilterBuilder {
  private _fromValue: Date | null = null;
  private _toValue: Date | null = null;
  private _messageTypesValue: Set<MessageType> | null = null;
  private _excludeSyntheticValue = false;
  private _lastNValue: number | null = null;
  private _keywordValue: string | null = null;
  private _pageValue: number | null = null;
  private _pageSizeValue: number | null = null;
  private _branchValue: string | null = null;

  get fromValue(): Date | null {
    return this._fromValue;
  }

  get toValue(): Date | null {
    return this._toValue;
  }

  get messageTypesValue(): Set<MessageType> | null {
    return this._messageTypesValue;
  }

  get excludeSyntheticValue(): boolean {
    return this._excludeSyntheticValue;
  }

  get lastNValue(): number | null {
    return this._lastNValue;
  }

  get keywordValue(): string | null {
    return this._keywordValue;
  }

  get pageValue(): number | null {
    return this._pageValue;
  }

  get pageSizeValue(): number | null {
    return this._pageSizeValue;
  }

  get branchValue(): string | null {
    return this._branchValue;
  }

  /** Only include events at or after this instant. */
  from(from: Date | null): this {
    this._fromValue = from;
    return this;
  }

  /** Only include events at or before this instant. */
  to(to: Date | null): this {
    this._toValue = to;
    return this;
  }

  /** Only include events whose {@link SessionEvent.messageType} is in this set. */
  messageTypes(messageTypes: Set<MessageType> | null): this {
    this._messageTypesValue = messageTypes;
    return this;
  }

  /** When `true`, synthetic framework events (compaction summaries) are excluded. */
  excludeSynthetic(excludeSynthetic: boolean): this {
    this._excludeSyntheticValue = excludeSynthetic;
    return this;
  }

  /**
   * Return at most the last `n` matching events (applied after all per-event filters).
   */
  lastN(lastN: number | null): this {
    this._lastNValue = lastN;
    return this;
  }

  /**
   * Case-insensitive substring to match against `message.text`. Events whose text is
   * `null` or does not contain the keyword are excluded.
   */
  keyword(keyword: string | null): this {
    this._keywordValue = keyword;
    return this;
  }

  /**
   * Zero-indexed page number for paginated results. Applied after per-event filtering in
   * chronological order (oldest first), so page 0 contains the oldest matching events.
   * Requires {@link pageSize} to be set.
   */
  page(page: number | null): this {
    this._pageValue = page;
    return this;
  }

  /** Number of results per page. Defaults to {@link EventFilter.DEFAULT_PAGE_SIZE}. */
  pageSize(pageSize: number | null): this {
    this._pageSizeValue = pageSize;
    return this;
  }

  /**
   * Restricts results to events visible to the agent at this dot-separated branch path.
   * See {@link EventFilter.forBranch} for the full visibility rule.
   */
  branch(branch: string | null): this {
    this._branchValue = branch;
    return this;
  }

  /** Constructs the {@link EventFilter}. */
  build(): EventFilter {
    return new EventFilter(this);
  }
}
