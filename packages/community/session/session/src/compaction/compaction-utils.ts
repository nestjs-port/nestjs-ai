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
  AssistantMessage,
  MessageType,
  ToolResponseMessage,
} from "@nestjs-ai/model";
import { StringUtils } from "@nestjs-port/core";
import type { SessionEvent } from "../session-event.js";

/**
 * Internal utilities shared by compaction strategies.
 */
export abstract class CompactionUtils {
  /**
   * Renders a {@link SessionEvent} as a single line of text suitable for token estimation
   * and LLM summarization prompts.
   *
   * Handles all NestJS AI message types:
   * - Plain user / assistant / system messages → `"Role: text"`
   * - {@link AssistantMessage} with tool calls →
   *   `"Assistant [tool calls: name(args), ...]"`
   * - {@link ToolResponseMessage} → `"Tool [responses: name -> data, ...]"`
   * @param event the session event to format
   * @returns a non-null, non-empty string representing the event
   */
  static formatEvent(event: SessionEvent): string {
    const role = CompactionUtils.roleOf(event.messageType);

    const message = event.message;
    if (message instanceof AssistantMessage && message.hasToolCalls()) {
      const calls = message.toolCalls
        .map((tc) => `${tc.name}(${tc.arguments})`)
        .join(", ");
      const text = message.text;
      return StringUtils.hasText(text)
        ? `${role}: ${text} [tool calls: ${calls}]`
        : `${role} [tool calls: ${calls}]`;
    }

    if (message instanceof ToolResponseMessage) {
      const responses = message.responses
        .map((r) => `${r.name} -> ${r.responseData}`)
        .join(", ");
      return `${role} [responses: ${responses}]`;
    }

    const text = message.text;
    return `${role}: ${text != null ? text : "[no text content]"}`;
  }

  /**
   * Advances `rawCutIndex` forward until it points to a root-level (null-branch)
   * {@link MessageType.USER} event, or to `real.length` if no such event exists.
   *
   * Compaction strategies compute a raw cut point (the index into the real-event list
   * where the kept window would start) based on event counts or token budgets. That raw
   * cut can land in the middle of a turn — for example at an assistant reply whose user
   * message would be archived. Snapping to the nearest turn start guarantees that the kept
   * window always begins at a complete turn, preserving conversation semantics.
   * @param real the list of non-synthetic session events
   * @param rawCutIndex the initial cut point; must be in `[0, real.length]`
   * @returns the adjusted index pointing to the first root-level USER event at or after
   * `rawCutIndex`, or `real.length` if none exists
   */
  static snapToTurnStart(real: SessionEvent[], rawCutIndex: number): number {
    let idx = rawCutIndex;
    while (
      idx < real.length &&
      !(real[idx].isRootEvent() && real[idx].messageType === MessageType.USER)
    ) {
      idx++;
    }
    return idx;
  }

  private static roleOf(messageType: MessageType): string {
    if (messageType === MessageType.USER) {
      return "User";
    }
    if (messageType === MessageType.ASSISTANT) {
      return "Assistant";
    }
    if (messageType === MessageType.SYSTEM) {
      return "System";
    }
    return "Tool";
  }
}
