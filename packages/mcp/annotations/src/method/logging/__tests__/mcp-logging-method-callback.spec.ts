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

import type {
  LoggingLevel,
  LoggingMessageNotification,
} from "@modelcontextprotocol/client";
import { describe, expect, it } from "vitest";

import { McpLogging } from "../../../mcp-logging.js";
import { McpLoggingMethodCallback } from "../mcp-logging-method-callback.js";
import { McpLoggingConsumerMethodException } from "../mcp-logging-method-callback.js";

const TEST_NOTIFICATION = {
  method: "logging/message",
  params: {
    level: "info" as LoggingLevel,
    logger: "test-logger",
    data: "This is a test message",
  },
} as unknown as LoggingMessageNotification;

describe("McpLoggingMethodCallback", () => {
  class ValidMethods {
    lastNotification: LoggingMessageNotification | null = null;

    lastLevel: LoggingLevel | null = null;

    lastLogger: string | null = null;

    lastData: string | null = null;

    @McpLogging({ clients: ["my-client-id"] })
    handleLoggingMessage(notification: LoggingMessageNotification): void {
      this.lastNotification = notification;
    }

    @McpLogging({ clients: ["my-client-id"] })
    handleLoggingMessageWithParams(
      level: LoggingLevel,
      logger: string,
      data: string,
    ): void {
      this.lastLevel = level;
      this.lastLogger = logger;
      this.lastData = data;
    }

    @McpLogging({ clients: ["my-client-id"] })
    async handleAsyncLoggingMessage(
      notification: LoggingMessageNotification,
    ): Promise<void> {
      this.lastNotification = notification;
      await Promise.resolve();
    }

    @McpLogging({ clients: ["my-client-id"] })
    async handleAsyncLoggingMessageWithParams(
      level: LoggingLevel,
      logger: string,
      data: string,
    ): Promise<void> {
      this.lastLevel = level;
      this.lastLogger = logger;
      this.lastData = data;
      await Promise.resolve();
    }
  }

  class ThrowingMethods {
    @McpLogging({ clients: ["my-client-id"] })
    handleLoggingMessage(_notification: LoggingMessageNotification): void {
      throw new RuntimeError("Test exception");
    }

    @McpLogging({ clients: ["my-client-id"] })
    async handleAsyncLoggingMessage(
      _notification: LoggingMessageNotification,
    ): Promise<void> {
      throw new RuntimeError("Async test exception");
    }
  }

  class RuntimeError extends Error {}

  it("test valid method with notification", async () => {
    const bean = new ValidMethods();
    const callback = new McpLoggingMethodCallback({
      provider: bean,
      propertyKey: "handleLoggingMessage",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).resolves.toBeUndefined();

    expect(bean.lastNotification).toBe(TEST_NOTIFICATION);
  });

  it("test valid method with params", async () => {
    const bean = new ValidMethods();
    const callback = new McpLoggingMethodCallback({
      provider: bean,
      propertyKey: "handleLoggingMessageWithParams",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).resolves.toBeUndefined();

    expect(bean.lastLevel).toBe(TEST_NOTIFICATION.params.level);
    expect(bean.lastLogger).toBe(TEST_NOTIFICATION.params.logger);
    expect(bean.lastData).toBe(TEST_NOTIFICATION.params.data);
  });

  it("test valid async method with notification", async () => {
    const bean = new ValidMethods();
    const callback = new McpLoggingMethodCallback({
      provider: bean,
      propertyKey: "handleAsyncLoggingMessage",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).resolves.toBeUndefined();

    expect(bean.lastNotification).toBe(TEST_NOTIFICATION);
  });

  it("test valid async method with params", async () => {
    const bean = new ValidMethods();
    const callback = new McpLoggingMethodCallback({
      provider: bean,
      propertyKey: "handleAsyncLoggingMessageWithParams",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).resolves.toBeUndefined();

    expect(bean.lastLevel).toBe(TEST_NOTIFICATION.params.level);
    expect(bean.lastLogger).toBe(TEST_NOTIFICATION.params.logger);
    expect(bean.lastData).toBe(TEST_NOTIFICATION.params.data);
  });

  it("test null notification", async () => {
    const bean = new ValidMethods();
    const callback = new McpLoggingMethodCallback({
      provider: bean,
      propertyKey: "handleLoggingMessage",
    });

    await expect(
      callback.apply(null as unknown as LoggingMessageNotification),
    ).rejects.toThrow("Notification must not be null");
  });

  it("test method invocation exception", async () => {
    const bean = new ThrowingMethods();
    const callback = new McpLoggingMethodCallback({
      provider: bean,
      propertyKey: "handleLoggingMessage",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).rejects.toThrow(
      McpLoggingConsumerMethodException,
    );
  });

  it("test async method invocation exception", async () => {
    const bean = new ThrowingMethods();
    const callback = new McpLoggingMethodCallback({
      provider: bean,
      propertyKey: "handleAsyncLoggingMessage",
    });

    await expect(callback.apply(TEST_NOTIFICATION)).rejects.toThrow(
      McpLoggingConsumerMethodException,
    );
  });
});
