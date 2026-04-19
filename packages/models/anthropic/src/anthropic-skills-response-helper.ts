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
import { stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Anthropic } from "@anthropic-ai/sdk";
import type { FileMetadata } from "@anthropic-ai/sdk/resources/beta/files";
import type { Message } from "@anthropic-ai/sdk/resources/messages";

import type { ChatResponse } from "@nestjs-ai/model";

/**
 * Helper utilities for working with Anthropic Claude Skills responses and files.
 *
 * Provides methods to extract file IDs, container IDs, and download files generated
 * by Skills.
 *
 * Unlike the RestClient module's helper which requires recursive Map/List crawling to
 * find file IDs in untyped response structures, this SDK-based helper uses the SDK's
 * typed {@link ContentBlock} variants with direct accessor methods.
 */
export abstract class AnthropicSkillsResponseHelper {
  /**
   * Extract all file IDs from a chat response. Searches through all content blocks in
   * the underlying SDK {@link Message} stored in response metadata.
   * @param response the chat response to search
   * @return list of file IDs found in the response (empty list if none found)
   */
  static extractFileIds(response: ChatResponse | null): string[] {
    if (response == null) {
      return [];
    }

    const message =
      AnthropicSkillsResponseHelper.getMessageFromMetadata(response);
    if (message == null || !Array.isArray(message.content)) {
      return [];
    }

    const fileIds: string[] = [];
    for (const block of message.content) {
      switch (block.type) {
        case "container_upload":
          fileIds.push(block.file_id);
          break;
        case "bash_code_execution_tool_result":
          if (block.content.type === "bash_code_execution_result") {
            for (const item of block.content.content) {
              fileIds.push(item.file_id);
            }
          }
          break;
        case "code_execution_tool_result":
          if (block.content.type === "code_execution_result") {
            for (const item of block.content.content) {
              fileIds.push(item.file_id);
            }
          }
          break;
      }
    }

    return fileIds;
  }

  /**
   * Extract container ID from a chat response for multi-turn conversation reuse.
   * @param response the chat response
   * @return container ID if present, null otherwise
   */
  static extractContainerId(response: ChatResponse | null): string | null {
    if (response == null) {
      return null;
    }

    const message =
      AnthropicSkillsResponseHelper.getMessageFromMetadata(response);
    return message?.container?.id ?? null;
  }

  /**
   * Download all files from a Skills response to a target directory.
   * @param response the chat response containing file IDs
   * @param client the Anthropic client to use for downloading (beta files API)
   * @param targetDir directory to save files (must exist)
   * @return list of paths to saved files
   * @throws Error if file download or saving fails
   */
  static async downloadAllFiles(
    response: ChatResponse,
    client: Anthropic,
    targetDir: string,
  ): Promise<string[]> {
    assert(response != null, "Response cannot be null");
    assert(client != null, "AnthropicClient cannot be null");
    assert(targetDir != null, "Target directory cannot be null");

    const targetStats = await stat(targetDir);
    assert(targetStats.isDirectory(), "Target path must be a directory");

    const fileIds = AnthropicSkillsResponseHelper.extractFileIds(response);

    return await Promise.all(
      fileIds.map(async (fileId) => {
        const metadata: FileMetadata =
          await client.beta.files.retrieveMetadata(fileId);
        const filePath = path.resolve(targetDir, metadata.filename);
        const download = await client.beta.files.download(fileId);
        await writeFile(filePath, new Uint8Array(await download.arrayBuffer()));
        return filePath;
      }),
    );
  }

  private static getMessageFromMetadata(
    response: ChatResponse,
  ): Message | null {
    const anthropicResponse =
      response.metadata.get<unknown>("anthropic-response");
    if (AnthropicSkillsResponseHelper.isMessageLike(anthropicResponse)) {
      return anthropicResponse;
    }
    return null;
  }

  private static isMessageLike(value: unknown): value is Message {
    return (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      value.type === "message"
    );
  }
}
