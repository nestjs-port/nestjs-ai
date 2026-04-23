/*
 * Copyright 2026-present the original author or authors.
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

import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { Anthropic } from "@anthropic-ai/sdk";
import { Prompt, UserMessage } from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  AnthropicChatModel,
  AnthropicChatOptions,
  AnthropicSetup,
  AnthropicSkill,
  AnthropicSkillsResponseHelper,
} from "../index.js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

describe.skipIf(!ANTHROPIC_API_KEY)("AnthropicSkillsIT", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  const logger = LoggerFactory.getLogger("AnthropicSkillsIT");
  let anthropicClient: Anthropic;
  let chatModel: AnthropicChatModel;

  beforeAll(() => {
    anthropicClient = AnthropicSetup.setupClient({
      apiKey: ANTHROPIC_API_KEY,
    });
    chatModel = new AnthropicChatModel({
      anthropicClient,
    });
  });

  it("should generate excel with xlsx skill", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "anthropic-skills-"));

    try {
      const userMessage = new UserMessage({
        content:
          "Please create an Excel file (.xlsx) with 3 columns: Name, Age, City. " +
          "Add 5 sample rows of data. Generate the actual file using the xlsx skill.",
      });

      const options = AnthropicChatOptions.builder()
        .model("claude-sonnet-4-5")
        .maxTokens(4096)
        .skill(AnthropicSkill.XLSX)
        .toolChoice({ type: "any" })
        .internalToolExecutionEnabled(false)
        .build();

      const prompt = new Prompt([userMessage], options);
      const response = await chatModel.call(prompt);

      expect(response).not.toBeNull();
      expect(response.results).not.toHaveLength(0);

      const responseText = response.result?.output.text ?? "";
      expect(responseText).not.toBe("");
      logger.info("XLSX Skill Response: %s", responseText);

      const normalizedResponseText = responseText.toLowerCase();
      expect(
        ["spreadsheet", "excel", "xlsx", "created", "file"].some((term) =>
          normalizedResponseText.includes(term),
        ),
      ).toBe(true);

      const fileIds = AnthropicSkillsResponseHelper.extractFileIds(response);
      expect(fileIds).not.toHaveLength(0);
      logger.info("Extracted %d file ID(s): %o", fileIds.length, fileIds);

      const downloadedFiles =
        await AnthropicSkillsResponseHelper.downloadAllFiles(
          response,
          anthropicClient,
          tempDir,
        );
      expect(downloadedFiles).not.toHaveLength(0);

      for (const filePath of downloadedFiles) {
        expect(filePath).toBeTruthy();
        expect(statSync(filePath).isFile()).toBe(true);
        expect(statSync(filePath).size).toBeGreaterThan(0);
        logger.info(
          "Downloaded file: %s (%d bytes)",
          filePath,
          statSync(filePath).size,
        );
      }

      const hasXlsxFile = downloadedFiles.some((filePath) =>
        filePath.toLowerCase().endsWith(".xlsx"),
      );
      expect(hasXlsxFile).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
