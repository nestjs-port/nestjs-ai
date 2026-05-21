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
import { McpLoggingProvider } from "../mcp-logging-provider.js";

describe("McpLoggingProvider", () => {
  it("testGetLoggingConsumers", async () => {
    const loggingHandler = new LoggingHandler();
    const provider = new McpLoggingProvider([loggingHandler]);

    const specifications = provider.getLoggingSpecifications();
    const consumers = specifications.map((spec) => spec.loggingHandler);

    expect(consumers).toHaveLength(2);

    const notification = {
      method: "logging/message",
      params: {
        level: "info" as LoggingLevel,
        logger: "test-logger",
        data: "This is a test message",
      },
    } as unknown as LoggingMessageNotification;

    await consumers[0]?.(notification);
    expect(loggingHandler.lastNotification).toEqual(notification);

    await consumers[1]?.(notification);
    expect(loggingHandler.lastLevel).toBe(notification.params.level);
    expect(loggingHandler.lastLogger).toBe(notification.params.logger);
    expect(loggingHandler.lastData).toBe(notification.params.data);
  });

  it("testEmptyList", () => {
    const provider = new McpLoggingProvider([]);

    expect(provider.getLoggingSpecifications()).toHaveLength(0);
  });

  it("testMultipleObjects", () => {
    const provider = new McpLoggingProvider([
      new LoggingHandler(),
      new LoggingHandler(),
    ]);

    expect(provider.getLoggingSpecifications()).toHaveLength(4);
  });

  it("testNullLoggingObjects", () => {
    expect(() => new McpLoggingProvider(null as never)).toThrow(
      "loggingObjects can't be null!",
    );
  });

  it("testNonAnnotatedMethodsIgnored", () => {
    const provider = new McpLoggingProvider([new LoggingHandler()]);

    expect(provider.getLoggingSpecifications()).toHaveLength(2);
  });
});

class LoggingHandler {
  public lastNotification: LoggingMessageNotification | null = null;

  public lastLevel: LoggingLevel | null = null;

  public lastLogger: string | null = null;

  public lastData: string | null = null;

  @McpLogging({ clients: ["test-client"] })
  public handleLoggingMessage(notification: LoggingMessageNotification): void {
    this.lastNotification = notification;
  }

  @McpLogging({ clients: ["my-client-id"] })
  public handleLoggingMessageWithParams(
    level: LoggingLevel,
    logger: string,
    data: string,
  ): void {
    this.lastLevel = level;
    this.lastLogger = logger;
    this.lastData = data;
  }

  public notAnnotatedMethod(_notification: LoggingMessageNotification): void {
    // This method should be ignored
  }
}
