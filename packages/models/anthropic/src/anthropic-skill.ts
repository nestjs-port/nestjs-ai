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

import { AnthropicSkillRecord } from "./anthropic-skill-record.js";
import { AnthropicSkillType } from "./anthropic-skill-type.js";

/**
 * Enum representing the pre-built Anthropic Skills available for Claude.
 */
export class AnthropicSkill {
  /**
   * Excel spreadsheet generation and manipulation.
   */
  static readonly XLSX = new AnthropicSkill(
    "xlsx",
    "Excel spreadsheet generation",
  );

  /**
   * PowerPoint presentation creation.
   */
  static readonly PPTX = new AnthropicSkill(
    "pptx",
    "PowerPoint presentation creation",
  );

  /**
   * Word document generation.
   */
  static readonly DOCX = new AnthropicSkill("docx", "Word document generation");

  /**
   * PDF document creation.
   */
  static readonly PDF = new AnthropicSkill("pdf", "PDF document creation");

  private static readonly BY_ID = new Map<string, AnthropicSkill>([
    [AnthropicSkill.XLSX.skillId.toLowerCase(), AnthropicSkill.XLSX],
    [AnthropicSkill.PPTX.skillId.toLowerCase(), AnthropicSkill.PPTX],
    [AnthropicSkill.DOCX.skillId.toLowerCase(), AnthropicSkill.DOCX],
    [AnthropicSkill.PDF.skillId.toLowerCase(), AnthropicSkill.PDF],
  ]);

  private constructor(
    private readonly _skillId: string,
    private readonly _description: string,
  ) {}

  /**
   * Look up a pre-built Anthropic skill by its ID.
   * @param skillId the skill ID (e.g., "xlsx", "pptx", "docx", "pdf")
   * @return the matching skill, or null if not found
   */
  static fromId(skillId: string | null): AnthropicSkill | null {
    if (skillId == null) {
      return null;
    }
    return AnthropicSkill.BY_ID.get(skillId.toLowerCase()) ?? null;
  }

  get skillId(): string {
    return this._skillId;
  }

  get description(): string {
    return this._description;
  }

  /**
   * Convert to an {@link AnthropicSkillRecord} with latest version.
   * @return skill record
   */
  toSkill(): AnthropicSkillRecord;
  /**
   * Convert to an {@link AnthropicSkillRecord} with specific version.
   * @param version version string
   * @return skill record
   */
  toSkill(version: string): AnthropicSkillRecord;
  toSkill(version = "latest"): AnthropicSkillRecord {
    return new AnthropicSkillRecord({
      type: AnthropicSkillType.ANTHROPIC,
      skillId: this._skillId,
      version,
    });
  }
}
