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

import { AnthropicSkill } from "./anthropic-skill.js";
import { AnthropicSkillRecord } from "./anthropic-skill-record.js";
import { AnthropicSkillType } from "./anthropic-skill-type.js";

/**
 * Container for Claude Skills in a chat completion request. Maximum of 8 skills per
 * request.
 */
export class AnthropicSkillContainer {
  private readonly _skills: readonly AnthropicSkillRecord[];

  constructor(skills: AnthropicSkillRecord[]) {
    assert(skills != null, "Skills list cannot be null");
    assert(skills.length > 0, "Skills list cannot be empty");
    if (skills.length > 8) {
      throw new Error(
        `Maximum of 8 skills per request. Provided: ${skills.length}`,
      );
    }
    this._skills = Object.freeze([...skills]);
  }

  get skills(): readonly AnthropicSkillRecord[] {
    return this._skills;
  }

  /**
   * Convert to a list of maps suitable for JSON serialization via
   * {@code JsonValue.from(Map.of("skills", container.toSkillsList()))}.
   * @return list of skill maps with type, skill_id, and version keys
   */
  toSkillsList(): BetaManagedAgentsSkillParams[] {
    return this._skills.map((skill) => skill.toJsonMap());
  }

  static builder(): AnthropicSkillContainer.Builder {
    return new AnthropicSkillContainer.Builder();
  }
}

export namespace AnthropicSkillContainer {
  export class Builder {
    private readonly _skills: AnthropicSkillRecord[] = [];

    /**
     * Add a skill by its ID or name. Automatically detects whether it's a pre-built
     * Anthropic skill (xlsx, pptx, docx, pdf) or a custom skill ID.
     * @param skillIdOrName the skill ID or name
     * @return this builder
     */
    skill(skillIdOrName: string): this;
    /**
     * Add a skill by its ID or name with a specific version.
     * @param skillIdOrName the skill ID or name
     * @param version the version (e.g., "latest", "20251013")
     * @return this builder
     */
    skill(skillIdOrName: string, version: string): this;
    /**
     * Add a pre-built Anthropic skill using the enum.
     * @param skill the Anthropic skill enum value
     * @return this builder
     */
    skill(skill: AnthropicSkill): this;
    /**
     * Add a pre-built Anthropic skill with a specific version.
     * @param skill the Anthropic skill enum value
     * @param version the version
     * @return this builder
     */
    skill(skill: AnthropicSkill, version: string): this;
    /**
     * Add a skill record directly.
     * @param skill the skill record
     * @return this builder
     */
    skill(skill: AnthropicSkillRecord): this;
    skill(
      skillIdOrName: string | AnthropicSkill | AnthropicSkillRecord,
      version?: string,
    ): this {
      assert(skillIdOrName != null, "Skill cannot be null");

      if (skillIdOrName instanceof AnthropicSkillRecord) {
        this._skills.push(skillIdOrName);
        return this;
      }

      if (skillIdOrName instanceof AnthropicSkill) {
        assert(skillIdOrName != null, "AnthropicSkill cannot be null");
        return version != null
          ? this.skill(skillIdOrName.toSkill(version))
          : this.skill(skillIdOrName.toSkill());
      }

      assert(
        StringUtils.hasText(skillIdOrName),
        "Skill ID or name cannot be empty",
      );

      const prebuilt = AnthropicSkill.fromId(skillIdOrName);
      if (prebuilt != null) {
        return version != null
          ? this.skill(prebuilt.toSkill(version))
          : this.skill(prebuilt.toSkill());
      }

      return version != null
        ? this.skill(
            new AnthropicSkillRecord({
              type: AnthropicSkillType.CUSTOM,
              skillId: skillIdOrName,
              version,
            }),
          )
        : this.skill(
            new AnthropicSkillRecord({
              type: AnthropicSkillType.CUSTOM,
              skillId: skillIdOrName,
            }),
          );
    }

    /**
     * Add multiple skills by their IDs or names.
     * @param skillIds the skill IDs or names
     * @return this builder
     */
    skills(...skillIds: string[]): this;
    /**
     * Add multiple skills from a list of IDs or names.
     * @param skillIds the list of skill IDs or names
     * @return this builder
     */
    skills(skillIds: readonly string[]): this;
    skills(...args: [readonly string[]] | string[]): this {
      const skillIds =
        args.length === 1 && Array.isArray(args[0]) ? [...args[0]] : [...args];

      assert(skillIds.length > 0, "Skill IDs cannot be empty");
      for (const skillId of skillIds) {
        this.skill(skillId);
      }
      return this;
    }

    build(): AnthropicSkillContainer {
      return new AnthropicSkillContainer([...this._skills]);
    }
  }
}
