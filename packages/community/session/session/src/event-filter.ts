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
 * Parameters for constructing an {@link EventFilter}. All fields are optional and default
 * to `null` / `false`, producing a filter equivalent to {@link EventFilter.all}.
 */
export interface EventFilterProps {
  /** Only include events at or after this instant. */
  from?: Date | null;
  /** Only include events at or before this instant. */
  to?: Date | null;
  /** Only include events whose {@link SessionEvent.messageType} is in this set. */
  messageTypes?: Set<MessageType> | null;
  /** When `true`, synthetic framework events (compaction summaries) are excluded. */
  excludeSynthetic?: boolean;
  /** Return at most the last `n` matching events (applied after all per-event filters). */
  lastN?: number | null;
  /**
   * Case-insensitive substring to match against `message.text`. Events whose text is
   * `null` or does not contain the keyword are excluded.
   */
  keyword?: string | null;
  /**
   * Zero-indexed page number for paginated results. Applied after per-event filtering in
   * chronological order (oldest first), so page 0 contains the oldest matching events.
   * Requires {@link EventFilterProps.pageSize} to be set.
   */
  page?: number | null;
  /** Number of results per page. */
  pageSize?: number | null;
  /**
   * Restricts results to events visible to the agent at this dot-separated branch path.
   * See {@link EventFilter.forBranch} for the full visibility rule.
   */
  branch?: string | null;
  /**
   * When `true`, events archived by compaction are excluded. Used to build the active
   * context window; leave `false` (the default) for Recall Storage searches that must
   * see the full history.
   */
  excludeArchived?: boolean;
}

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
 * Use the static factory methods for common cases or the props constructor for custom
 * combinations:
 *
 * ```ts
 * const filter = new EventFilter({
 *   from: new Date("2025-01-01T00:00:00Z"),
 *   messageTypes: new Set([MessageType.USER, MessageType.ASSISTANT]),
 *   excludeSynthetic: true,
 *   branch: "orch.researcher",
 * });
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
  private readonly _excludeArchived: boolean;

  constructor(props: EventFilterProps = {}) {
    let keyword = props.keyword ?? null;
    let messageTypes = props.messageTypes ?? null;
    let page = props.page ?? null;
    const pageSize = props.pageSize ?? null;
    const lastN = props.lastN ?? null;

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

    this._from = props.from ?? null;
    this._to = props.to ?? null;
    this._messageTypes = messageTypes;
    this._excludeSynthetic = props.excludeSynthetic ?? false;
    this._lastN = lastN;
    this._keyword = keyword;
    this._page = page;
    this._pageSize = pageSize;
    this._branch = props.branch ?? null;
    this._excludeArchived = props.excludeArchived ?? false;
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

  get excludeArchived(): boolean {
    return this._excludeArchived;
  }

  merge(other: EventFilter): EventFilter {
    return new EventFilter({
      from: other._from ?? this._from,
      to: other._to ?? this._to,
      messageTypes: other._messageTypes ?? this._messageTypes,
      excludeSynthetic: other._excludeSynthetic || this._excludeSynthetic,
      lastN: other._lastN ?? this._lastN,
      keyword: other._keyword ?? this._keyword,
      page: other._page ?? this._page,
      pageSize: other._pageSize ?? this._pageSize,
      branch: other._branch ?? this._branch,
      excludeArchived: other._excludeArchived || this._excludeArchived,
    });
  }

  /** Returns all events with no filtering. */
  static all(): EventFilter {
    return new EventFilter();
  }

  /** Returns only active (non-archived) events. */
  static active(): EventFilter {
    return new EventFilter({ excludeArchived: true });
  }

  /** Returns the last `n` events. */
  static lastN(n: number): EventFilter {
    return new EventFilter({ lastN: n });
  }

  /** Excludes synthetic (framework-generated) events such as compaction summaries. */
  static realOnly(): EventFilter {
    return new EventFilter({ excludeSynthetic: true });
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
    return new EventFilter({ keyword, page, pageSize });
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
    return new EventFilter({ branch: agentBranch });
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
    if (this._excludeArchived && event.isArchived()) {
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
