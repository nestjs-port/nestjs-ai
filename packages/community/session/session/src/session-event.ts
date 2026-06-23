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

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  AssistantMessage,
  type Message,
  type MessageType,
} from "@nestjs-ai/model";

/**
 * Parameters for constructing a {@link SessionEvent}.
 *
 * `sessionId` and `message` are required. `id` is auto-generated (random UUID) when
 * omitted, `timestamp` defaults to the current instant, `metadata` defaults to an empty
 * record, and `branch` defaults to `null` (a root-level event).
 */
export interface SessionEventProps {
  id?: string;
  sessionId: string;
  timestamp?: Date;
  message: Message;
  metadata?: Record<string, unknown>;
  branch?: string | null;
  archived?: boolean;
}

/**
 * An atomic unit in the session's conversation history.
 *
 * `SessionEvent` is a _thin wrapper_ around the existing NestJS AI {@link Message}
 * types. There is no duplication of content structures — the existing `UserMessage`,
 * `AssistantMessage`, `SystemMessage`, and `ToolResponseMessage` classes carry the
 * actual content. `SessionEvent` adds only what {@link Message} intentionally lacks:
 * identity, ordering, session-level provenance, and agent-branch attribution.
 *
 * The wrapped {@link Message} already encodes the event type via its {@link MessageType}:
 * - `UserMessage` → user input
 * - `AssistantMessage` (no tool calls) → agent response
 * - `AssistantMessage` (with tool calls) → tool invocation
 * - `ToolResponseMessage` → tool output
 * - `UserMessage` + {@link isSynthetic} → synthetic shadow prompt that opens a summary turn
 * - `AssistantMessage` + {@link isSynthetic} → compaction summary text that closes a summary turn
 *
 * Events are immutable once created (append-only log semantics).
 */
export class SessionEvent {
  /** Metadata key for the `synthetic` flag (value: `boolean`). */
  static readonly METADATA_SYNTHETIC = "synthetic";

  /** Metadata key identifying which compaction strategy produced a synthetic event. */
  static readonly METADATA_COMPACTION_SOURCE = "compactionSource";

  private readonly _id: string;
  private readonly _sessionId: string;
  private readonly _timestamp: Date;
  private readonly _message: Message;
  private readonly _metadata: Record<string, unknown>;
  private readonly _branch: string | null;
  private readonly _archived: boolean;

  constructor(props: SessionEventProps) {
    const id = props.id ?? randomUUID();
    assert(id.length > 0, "id must not be null or empty");
    assert(props.sessionId.length > 0, "sessionId must not be null or empty");
    assert(props.message != null, "message must not be null");
    this._id = id;
    this._sessionId = props.sessionId;
    this._timestamp = props.timestamp ?? new Date();
    this._message = props.message;
    this._metadata = { ...props.metadata };
    this._branch = props.branch ?? null;
    this._archived = props.archived ?? false;
  }

  /** Unique identity per event. {@link Message} has none. */
  get id(): string {
    return this._id;
  }

  /** Session ownership and isolation. */
  get sessionId(): string {
    return this._sessionId;
  }

  /** Chronological ordering within the session. */
  get timestamp(): Date {
    return this._timestamp;
  }

  /** The actual NestJS AI message — no duplication of content. */
  get message(): Message {
    return this._message;
  }

  /**
   * Session-level flags: {@link METADATA_SYNTHETIC}, {@link METADATA_COMPACTION_SOURCE},
   * etc.
   */
  get metadata(): Record<string, unknown> {
    return this._metadata;
  }

  /**
   * Dot-separated agent hierarchy path that produced this event (e.g.
   * `"orchestrator.researcher"`). `null` for root-level events that predate any
   * delegation. Used by `EventFilter.forBranch(string)` to isolate peer sub-agents'
   * histories from each other.
   */
  get branch(): string | null {
    return this._branch;
  }

  /**
   * Returns `true` if this event belongs to the root conversation thread, i.e. was not
   * produced inside any delegated sub-agent branch. Root events have a `null` branch.
   * @returns `true` if this event is a root-level event, `false` otherwise
   */
  isRootEvent(): boolean {
    return this._branch === null;
  }

  /**
   * Returns `true` if this event has been archived by compaction. Archived events are
   * removed from the active context window injected into the prompt, but are retained in
   * the event log and remain searchable via the Recall Storage tools (see
   * `SessionEventTools`). They implement the MemGPT recall pattern: the full verbatim
   * history is preserved even after older events have been summarized out of the active
   * window.
   * @returns `true` if this event is archived, `false` otherwise
   */
  isArchived(): boolean {
    return this._archived;
  }

  /**
   * Returns a copy of this event marked as archived. Identity ({@link id} and
   * {@link sessionId}) is preserved. Returns `this` when the event is already archived.
   * @returns an archived copy of this event
   */
  asArchived(): SessionEvent {
    if (this._archived) {
      return this;
    }
    return new SessionEvent({
      id: this._id,
      sessionId: this._sessionId,
      timestamp: this._timestamp,
      message: this._message,
      metadata: this._metadata,
      branch: this._branch,
      archived: true,
    });
  }

  /**
   * Convenience accessor — delegates to the wrapped message. No need to unwrap for common
   * type-switch operations.
   */
  get messageType(): MessageType {
    return this._message.messageType;
  }

  /**
   * Returns `true` for events generated by the framework (e.g. compaction summaries), not
   * by a real user/agent turn.
   */
  isSynthetic(): boolean {
    return (
      (this._metadata[SessionEvent.METADATA_SYNTHETIC] as boolean) ?? false
    );
  }

  /**
   * Returns `true` for assistant messages that include tool invocations. Delegates to
   * {@link AssistantMessage.hasToolCalls} — no separate event type needed.
   */
  hasToolCalls(): boolean {
    return (
      this._message instanceof AssistantMessage && this._message.hasToolCalls()
    );
  }
}
