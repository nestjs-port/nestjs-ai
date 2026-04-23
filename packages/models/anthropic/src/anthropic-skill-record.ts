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
import type { BetaManagedAgentsSkillParams } from "@anthropic-ai/sdk/resources/beta";
import { StringUtils } from "@nestjs-port/core";
import type { AnthropicSkillType } from "./anthropic-skill-type.js";

export interface AnthropicSkillRecordProps {
  type: AnthropicSkillType;
  skillId: string;
  version?: string;
}

/**
 * Represents a Claude Skill - either pre-built Anthropic skill or custom skill.
 * Skills are collections of instructions, scripts, and resources that extend
 * Claude's capabilities for specific domains.
 */
export class AnthropicSkillRecord {
  private readonly _type: AnthropicSkillType;
  private readonly _skillId: string;
  private readonly _version: string;

  constructor(props: AnthropicSkillRecordProps) {
    assert(props.type != null, "Skill type cannot be null");
    assert(StringUtils.hasText(props.skillId), "Skill ID cannot be empty");
    assert(
      StringUtils.hasText(props.version ?? "latest"),
      "Version cannot be empty",
    );
    this._type = props.type;
    this._skillId = props.skillId;
    this._version = props.version ?? "latest";
  }

  get type(): AnthropicSkillType {
    return this._type;
  }

  get skillId(): string {
    return this._skillId;
  }

  get version(): string {
    return this._version;
  }

  toJsonMap(): BetaManagedAgentsSkillParams {
    return {
      type: this._type,
      skill_id: this._skillId,
      version: this._version,
    };
  }
}
