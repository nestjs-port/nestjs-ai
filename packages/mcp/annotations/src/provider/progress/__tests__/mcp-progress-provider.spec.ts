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

import "reflect-metadata";

import type { ProgressNotification } from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import { McpProgress } from "../../../mcp-progress.js";
import { McpProgressProvider } from "../mcp-progress-provider.js";

describe("McpProgressProvider", () => {
  it("testGetProgressSpecifications", async () => {
    const progressHandler = new ProgressHandler();
    const provider = new McpProgressProvider([progressHandler]);

    const specifications = provider.getProgressSpecifications();
    const consumers = specifications.map((spec) => spec.progressHandler);

    expect(consumers).toHaveLength(4);

    const notification = {
      method: "notifications/progress",
      params: {
        progressToken: "test-token-123",
        progress: 0.5,
        total: 100,
      },
    } as unknown as ProgressNotification;

    for (const consumer of consumers) {
      await consumer(notification);
    }

    expect(progressHandler.lastNotification).toEqual(notification);
    expect(progressHandler.lastProgress).toBe(notification.params.progress);
    expect(progressHandler.lastProgressToken).toBe(
      notification.params.progressToken,
    );
    expect(progressHandler.lastTotal).toBe(String(notification.params.total));
  });

  it("testEmptyList", () => {
    const provider = new McpProgressProvider([]);

    expect(provider.getProgressSpecifications()).toHaveLength(0);
  });

  it("testMultipleObjects", () => {
    const provider = new McpProgressProvider([
      new ProgressHandler(),
      new ProgressHandler(),
    ]);

    expect(provider.getProgressSpecifications()).toHaveLength(8);
  });

  it("testNullProgressObjects", () => {
    const provider = new McpProgressProvider(null as never);

    expect(provider.getProgressSpecifications()).toHaveLength(0);
  });

  it("testClientIdExtraction", () => {
    const provider = new McpProgressProvider([new ProgressHandler()]);

    const specifications = provider.getProgressSpecifications();

    expect(specifications).toHaveLength(4);
    expect(specifications.every((spec) => spec.clients.length > 0)).toBe(true);
  });
});

class ProgressHandler {
  public lastNotification: ProgressNotification | null = null;

  public lastProgress: number | null = null;

  public lastProgressToken: string | null = null;

  public lastTotal: string | null = null;

  @McpProgress({ clients: ["my-client-id"] })
  public handleProgressNotification(notification: ProgressNotification): void {
    this.lastNotification = notification;
  }

  @McpProgress({ clients: ["my-client-id"] })
  public handleProgressWithParams(
    progress: number,
    progressToken: string,
    total: string | null,
  ): void {
    this.lastProgress = progress;
    this.lastProgressToken = progressToken;
    this.lastTotal = total;
  }

  @McpProgress({ clients: ["my-client-id"] })
  public handleProgressWithPrimitiveDouble(
    progress: number,
    progressToken: string,
    total: string | null,
  ): void {
    this.lastProgress = progress;
    this.lastProgressToken = progressToken;
    this.lastTotal = total;
  }

  public notAnnotatedMethod(_notification: ProgressNotification): void {
    // This method should be ignored
  }

  // @ts-expect-error @McpProgress only supports methods returning void or Promise<void>
  @McpProgress({ clients: ["my-client-id"] })
  public invalidReturnType(_notification: ProgressNotification): string {
    return "Invalid";
  }
}
