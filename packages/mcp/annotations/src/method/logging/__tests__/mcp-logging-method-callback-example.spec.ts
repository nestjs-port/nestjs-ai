import type {
  LoggingLevel,
  LoggingMessageNotification,
} from "@modelcontextprotocol/client";
import { McpLogging } from "../../../mcp-logging.js";
import { McpLoggingMethodCallback } from "../mcp-logging-method-callback.js";

/**
 * Example class demonstrating logging method callback usage.
 */
export class McpLoggingMethodCallbackExample {
  @McpLogging({ clients: ["test-client"] })
  handleLoggingMessage(notification: LoggingMessageNotification): void {
    console.log(
      `Received logging message: ${notification.params.level} - ${notification.params.logger} - ${notification.params.data}`,
    );
  }

  @McpLogging({ clients: ["test-client"] })
  handleLoggingMessageWithParams(
    level: LoggingLevel,
    logger: string,
    data: string,
  ): void {
    console.log(
      `Received logging message with params: ${level} - ${logger} - ${data}`,
    );
  }

  @McpLogging({ clients: ["test-client"] })
  async handleAsyncLoggingMessage(
    notification: LoggingMessageNotification,
  ): Promise<void> {
    console.log(
      `Received async logging message: ${notification.params.level} - ${notification.params.logger} - ${notification.params.data}`,
    );
  }

  @McpLogging({ clients: ["test-client"] })
  async handleAsyncLoggingMessageWithParams(
    level: LoggingLevel,
    logger: string,
    data: string,
  ): Promise<void> {
    console.log(
      `Received async logging message with params: ${level} - ${logger} - ${data}`,
    );
  }

  @McpLogging({ clients: ["test-client"] })
  handleLoggingMessageVoid(notification: LoggingMessageNotification): void {
    console.log(
      `Received logging message (void): ${notification.params.level} - ${notification.params.logger} - ${notification.params.data}`,
    );
  }

  // Test methods for invalid scenarios

  // @ts-expect-error @McpLogging only supports methods returning void or Promise<void>
  @McpLogging({ clients: ["test-client"] })
  invalidReturnType(notification: LoggingMessageNotification): string {
    void notification;

    return "Invalid return type";
  }

  // @ts-expect-error @McpLogging only supports methods returning void or Promise<void>
  @McpLogging({ clients: ["test-client"] })
  async invalidPromiseReturnType(
    notification: LoggingMessageNotification,
  ): Promise<string> {
    void notification;

    return "Invalid promise return type";
  }

  // @ts-expect-error @McpLogging only supports methods with either a single LoggingMessageNotification parameter or three parameters
  @McpLogging({ clients: ["test-client"] })
  invalidParameterCount(
    notification: LoggingMessageNotification,
    extra: string,
  ): Promise<void> {
    void notification;
    void extra;

    return Promise.resolve();
  }

  // @ts-expect-error @McpLogging only supports methods with either a single LoggingMessageNotification parameter or three parameters
  @McpLogging({ clients: ["test-client"] })
  invalidParameterType(notification: string): Promise<void> {
    void notification;

    return Promise.resolve();
  }

  // @ts-expect-error @McpLogging only supports methods with either a single LoggingMessageNotification parameter or three parameters
  @McpLogging({ clients: ["test-client"] })
  invalidParameterTypes(
    level: string,
    logger: number,
    data: boolean,
  ): Promise<void> {
    void level;
    void logger;
    void data;

    return Promise.resolve();
  }

  static async main(): Promise<void> {
    const example = new McpLoggingMethodCallbackExample();
    const callback1 = new McpLoggingMethodCallback({
      provider: example,
      propertyKey: "handleLoggingMessage",
    });
    const callback2 = new McpLoggingMethodCallback({
      provider: example,
      propertyKey: "handleLoggingMessageWithParams",
    });
    const callback3 = new McpLoggingMethodCallback({
      provider: example,
      propertyKey: "handleLoggingMessageVoid",
    });

    const notification: LoggingMessageNotification = {
      method: "logging/message",
      params: {
        level: "info" as LoggingLevel,
        logger: "test-logger",
        data: "This is a test message",
      },
    } as unknown as LoggingMessageNotification;

    console.log("Using callback1:");
    await callback1.apply(notification);

    console.log("\nUsing callback2:");
    await callback2.apply(notification);

    console.log("\nUsing callback3 (void method):");
    await callback3.apply(notification);
  }
}

void McpLoggingMethodCallbackExample;
