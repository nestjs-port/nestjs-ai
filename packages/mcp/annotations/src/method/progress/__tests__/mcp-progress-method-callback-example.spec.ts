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

import type { ProgressNotification } from "@modelcontextprotocol/client";
import { McpProgress } from "../../../mcp-progress.js";
import { McpProgressMethodCallback } from "../mcp-progress-method-callback.js";

/**
 * Example demonstrating the usage of asynchronous progress method callbacks.
 */
export class McpProgressMethodCallbackExample {
  private constructor() {}

  static async main(): Promise<void> {
    const service = new AsyncProgressService();

    const asyncNotificationCallback = new McpProgressMethodCallback({
      provider: service,
      propertyKey: "handleProgressNotificationAsync",
    });

    const syncParamsCallback = new McpProgressMethodCallback({
      provider: service,
      propertyKey: "handleProgressWithParams",
    });

    const asyncParamsCallback = new McpProgressMethodCallback({
      provider: service,
      propertyKey: "handleProgressWithParamsAsync",
    });

    const primitiveCallback = new McpProgressMethodCallback({
      provider: service,
      propertyKey: "handleProgressPrimitive",
    });

    console.log("=== Async Progress Notification Example ===");

    const progressFlux = [
      createProgressNotification(
        "async-task-001",
        0.0,
        100.0,
        "Starting async operation...",
      ),
      createProgressNotification(
        "async-task-001",
        0.25,
        100.0,
        "Processing batch 1...",
      ),
      createProgressNotification(
        "async-task-001",
        0.5,
        100.0,
        "Halfway through...",
      ),
      createProgressNotification(
        "async-task-001",
        0.75,
        100.0,
        "Processing batch 3...",
      ),
      createProgressNotification(
        "async-task-001",
        1.0,
        100.0,
        "Operation completed successfully!",
      ),
    ];

    for (const [index, notification] of progressFlux.entries()) {
      if (index === 0) {
        await asyncNotificationCallback.apply(notification);
      } else if (index === 1) {
        await syncParamsCallback.apply(notification);
      } else if (index === 2) {
        await asyncParamsCallback.apply(notification);
      } else if (index === 3) {
        await primitiveCallback.apply(notification);
      } else {
        await asyncNotificationCallback.apply(notification);
      }
    }

    console.log("Processing notifications asynchronously...");
    console.log(
      `\nTotal async notifications handled: ${service.getNotificationCount()}`,
    );

    console.log("\n=== Concurrent Progress Processing ===");

    const concurrentNotifications = Array.from({ length: 5 }, (_, index) =>
      createProgressNotification(
        `concurrent-task-${index + 1}`,
        (index + 1) * 0.2,
        100.0,
        `Processing task ${index + 1}`,
      ),
    );

    await Promise.all(
      concurrentNotifications.map(async (notification) => {
        console.log(`Starting: ${notification.params.progressToken}`);
        await asyncNotificationCallback.apply(notification);
        console.log(`Completed: ${notification.params.progressToken}`);
      }),
    );

    console.log("\nAll async operations completed!");
  }
}

class AsyncProgressService {
  private readonly notificationCount = { value: 0 };

  @McpProgress({ clients: ["my-client-id"] })
  handleProgressNotificationAsync(
    notification: ProgressNotification,
  ): Promise<void> {
    return Promise.resolve().then(() => {
      this.notificationCount.value += 1;
      console.log(
        `[Async] Progress Update #${this.notificationCount.value}: Token=${notification.params.progressToken}, Progress=${notification.params.progress * 100}%, Total=${notification.params.total ?? 0}, Message=${notification.params.message}`,
      );
    });
  }

  @McpProgress({ clients: ["my-client-id"] })
  handleProgressWithParams(
    progress: number,
    progressToken: string,
    total: string | null,
  ): void {
    console.log(
      `[Sync in Async] Progress: ${progress * 100}% for token ${progressToken} (Total: ${total})`,
    );
  }

  @McpProgress({ clients: ["my-client-id"] })
  handleProgressWithParamsAsync(
    progress: number,
    progressToken: string,
    total: string | null,
  ): Promise<void> {
    return Promise.resolve().then(() => {
      console.log(
        `[Async Params] Progress: ${progress * 100}% for token ${progressToken} (Total: ${total})`,
      );
    });
  }

  @McpProgress({ clients: ["my-client-id"] })
  handleProgressPrimitive(
    progress: number,
    progressToken: string,
    total: string | null,
  ): void {
    void total;
    console.log(
      `[Primitive] Processing: ${progress * 100}% complete (Token: ${progressToken})`,
    );
  }

  // Invalid signatures for compile-time validation only

  // @ts-expect-error @McpProgress only supports methods returning void or Promise<void>
  @McpProgress({ clients: ["my-client-id"] })
  invalidReturnType(notification: ProgressNotification): string {
    void notification;

    return "Invalid return type";
  }

  // @ts-expect-error @McpProgress only supports methods returning void or Promise<void>
  @McpProgress({ clients: ["my-client-id"] })
  async invalidPromiseReturnType(
    notification: ProgressNotification,
  ): Promise<string> {
    void notification;

    return "Invalid promise return type";
  }

  // @ts-expect-error @McpProgress only supports methods with either a single ProgressNotification parameter or three parameters
  @McpProgress({ clients: ["my-client-id"] })
  noParameters(): void {}

  // @ts-expect-error @McpProgress only supports methods with either a single ProgressNotification parameter or three parameters
  @McpProgress({ clients: ["my-client-id"] })
  wrongSingleParameterType(_notification: string): void {}

  // @ts-expect-error @McpProgress only supports methods with either a single ProgressNotification parameter or three parameters
  @McpProgress({ clients: ["my-client-id"] })
  tooManyParameters(
    _notification: ProgressNotification,
    _extra: string,
  ): void {}

  // @ts-expect-error @McpProgress only supports methods with either a single ProgressNotification parameter or three parameters
  @McpProgress({ clients: ["my-client-id"] })
  wrongParameterTypes(
    _progress: string,
    _progressToken: number,
    _total: boolean,
  ): void {}

  // @ts-expect-error @McpProgress only supports methods with either a single ProgressNotification parameter or three parameters
  @McpProgress({ clients: ["my-client-id"] })
  wrongFirstParameterType(
    _progress: string,
    _progressToken: string,
    _total: string,
  ): void {}

  // @ts-expect-error @McpProgress only supports methods with either a single ProgressNotification parameter or three parameters
  @McpProgress({ clients: ["my-client-id"] })
  wrongSecondParameterType(
    _progress: number,
    _progressToken: number,
    _total: string,
  ): void {}

  // @ts-expect-error @McpProgress only supports methods with either a single ProgressNotification parameter or three parameters
  @McpProgress({ clients: ["my-client-id"] })
  wrongThirdParameterType(
    _progress: number,
    _progressToken: string,
    _total: number,
  ): void {}

  getNotificationCount(): number {
    return this.notificationCount.value;
  }
}

function createProgressNotification(
  progressToken: string,
  progress: number,
  total: number,
  message: string,
): ProgressNotification {
  return {
    method: "notifications/message",
    params: {
      progressToken,
      progress,
      total,
      message,
    },
  } as unknown as ProgressNotification;
}

void McpProgressMethodCallbackExample;
