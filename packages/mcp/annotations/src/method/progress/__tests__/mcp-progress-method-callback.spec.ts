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

import type { ProgressNotification } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { McpProgress } from "../../../mcp-progress.js";
import { McpProgressMethodException } from "../abstract-mcp-progress-method-callback.js";
import { McpProgressMethodCallback } from "../mcp-progress-method-callback.js";

const TEST_NOTIFICATION = createProgressNotification(
  "progress-token-123",
  0.5,
  100,
  "Processing...",
);

describe("McpProgressMethodCallback", () => {
  class ValidMethods {
    lastNotification: ProgressNotification | null = null;

    lastProgress: number | null = null;

    lastProgressToken: string | null = null;

    lastTotal: string | null = null;

    @McpProgress({ clients: ["my-client-id"] })
    handleProgressVoid(notification: ProgressNotification): void {
      this.lastNotification = notification;
    }

    @McpProgress({ clients: ["my-client-id"] })
    async handleProgressMono(
      notification: ProgressNotification,
    ): Promise<void> {
      this.lastNotification = notification;
      await Promise.resolve();
    }

    @McpProgress({ clients: ["my-client-id"] })
    handleProgressWithParams(
      progress: number,
      progressToken: string,
      total: string | null,
    ): void {
      this.lastProgress = progress;
      this.lastProgressToken = progressToken;
      this.lastTotal = total;
    }

    @McpProgress({ clients: ["my-client-id"] })
    async handleProgressWithParamsMono(
      progress: number,
      progressToken: string,
      total: string | null,
    ): Promise<void> {
      this.lastProgress = progress;
      this.lastProgressToken = progressToken;
      this.lastTotal = total;
      await Promise.resolve();
    }

    @McpProgress({ clients: ["my-client-id"] })
    handleProgressWithPrimitiveDouble(
      progress: number,
      progressToken: string,
      total: string | null,
    ): void {
      void total;
      this.lastProgress = progress;
      this.lastProgressToken = progressToken;
      this.lastTotal = total;
    }
  }

  class ThrowingMethods {
    @McpProgress({ clients: ["my-client-id"] })
    handleProgressVoid(_notification: ProgressNotification): void {
      throw new RuntimeError("Test exception");
    }

    @McpProgress({ clients: ["my-client-id"] })
    async handleProgressMono(
      _notification: ProgressNotification,
    ): Promise<void> {
      throw new RuntimeError("Async test exception");
    }
  }

  class RuntimeError extends Error {}

  it("test valid void method", async () => {
    const bean = new ValidMethods();
    const callback = new McpProgressMethodCallback({
      provider: bean,
      propertyKey: "handleProgressVoid",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).resolves.toBeUndefined();

    expect(bean.lastNotification).toBe(TEST_NOTIFICATION);
  });

  it("test valid method with notification", async () => {
    const bean = new ValidMethods();
    const callback = new McpProgressMethodCallback({
      provider: bean,
      propertyKey: "handleProgressMono",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).resolves.toBeUndefined();

    expect(bean.lastNotification).toBe(TEST_NOTIFICATION);
  });

  it("test valid method with params", async () => {
    const bean = new ValidMethods();
    const callback = new McpProgressMethodCallback({
      provider: bean,
      propertyKey: "handleProgressWithParams",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).resolves.toBeUndefined();

    expect(bean.lastProgress).toBe(TEST_NOTIFICATION.params.progress);
    expect(bean.lastProgressToken).toBe(TEST_NOTIFICATION.params.progressToken);
    expect(bean.lastTotal).toBe(String(TEST_NOTIFICATION.params.total));
  });

  it("test valid method with params mono", async () => {
    const bean = new ValidMethods();
    const callback = new McpProgressMethodCallback({
      provider: bean,
      propertyKey: "handleProgressWithParamsMono",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).resolves.toBeUndefined();

    expect(bean.lastProgress).toBe(TEST_NOTIFICATION.params.progress);
    expect(bean.lastProgressToken).toBe(TEST_NOTIFICATION.params.progressToken);
    expect(bean.lastTotal).toBe(String(TEST_NOTIFICATION.params.total));
  });

  it("test valid method with primitive double", async () => {
    const bean = new ValidMethods();
    const callback = new McpProgressMethodCallback({
      provider: bean,
      propertyKey: "handleProgressWithPrimitiveDouble",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).resolves.toBeUndefined();

    expect(bean.lastProgress).toBe(TEST_NOTIFICATION.params.progress);
    expect(bean.lastProgressToken).toBe(TEST_NOTIFICATION.params.progressToken);
    expect(bean.lastTotal).toBe(String(TEST_NOTIFICATION.params.total));
  });

  it("test null notification", async () => {
    const bean = new ValidMethods();
    const callback = new McpProgressMethodCallback({
      provider: bean,
      propertyKey: "handleProgressMono",
    });

    await expect(
      callback.apply(null as unknown as ProgressNotification),
    ).rejects.toThrow("Notification must not be null");
  });

  it("test method invocation error", async () => {
    const bean = new ThrowingMethods();
    const callback = new McpProgressMethodCallback({
      provider: bean,
      propertyKey: "handleProgressVoid",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).rejects.toThrow(
      McpProgressMethodException,
    );
  });

  it("test async method invocation error", async () => {
    const bean = new ThrowingMethods();
    const callback = new McpProgressMethodCallback({
      provider: bean,
      propertyKey: "handleProgressMono",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).rejects.toThrow(
      McpProgressMethodException,
    );
  });
});

function createProgressNotification(
  progressToken: string,
  progress: number,
  total: number,
  message: string,
): ProgressNotification {
  return {
    method: "notifications/progress",
    params: {
      progressToken,
      progress,
      total,
      message,
    },
  } as unknown as ProgressNotification;
}
