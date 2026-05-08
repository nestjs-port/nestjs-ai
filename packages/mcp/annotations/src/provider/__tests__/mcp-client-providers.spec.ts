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
  CreateMessageRequest,
  CreateMessageResult,
  ElicitRequest,
  LoggingLevel,
  LoggingMessageNotification,
  ProgressNotification,
  Prompt,
  Resource,
  Tool,
} from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";

import { McpElicitation } from "../../mcp-elicitation.js";
import { McpLogging } from "../../mcp-logging.js";
import { McpProgress } from "../../mcp-progress.js";
import { McpPromptListChanged } from "../../mcp-prompt-list-changed.js";
import { McpResourceListChanged } from "../../mcp-resource-list-changed.js";
import { McpSampling } from "../../mcp-sampling.js";
import { McpToolListChanged } from "../../mcp-tool-list-changed.js";
import { StructuredElicitResult } from "../../context/index.js";
import {
  McpElicitationProvider,
  McpLoggingProvider,
  McpProgressProvider,
  McpPromptListChangedProvider,
  McpResourceListChangedProvider,
  McpToolListChangedProvider,
  McpSamplingProvider,
} from "../index.js";

describe("provider scans", () => {
  it("discovers sampling methods", async () => {
    class SamplingBean {
      @McpSampling({ clients: ["sample-client"] })
      handleSampling(_request: CreateMessageRequest): CreateMessageResult {
        return {
          role: "assistant",
          content: {
            type: "text",
            text: "sampling",
          },
          model: "sample-model",
        };
      }
    }

    const provider = new McpSamplingProvider({
      samplingObjects: [new SamplingBean()],
    });

    const specs = provider.getSamplingSpecifications();
    const spec = specs[0];

    expect(specs).toHaveLength(1);
    expect(spec).toBeDefined();
    expect(spec?.clients).toEqual(["sample-client"]);
  });

  it("discovers elicitation methods", async () => {
    class ElicitationBean {
      @McpElicitation({ clients: ["client-a"] })
      handleElicitation(_request: ElicitRequest): StructuredElicitResult<{
        answer: string;
      }> {
        return new StructuredElicitResult({
          structuredContent: { answer: "elicitation" },
        });
      }
    }

    const provider = new McpElicitationProvider({
      elicitationObjects: [new ElicitationBean()],
    });

    const specs = provider.getElicitationSpecifications();
    const spec = specs[0];
    expect(spec).toBeDefined();

    const result = await spec!.elicitationHandler({
      method: "elicitation/create",
      params: {
        message: "prompt",
        requestedSchema: { type: "object", properties: {} },
      },
    } as unknown as ElicitRequest);

    expect(specs).toHaveLength(1);
    expect(specs[0]?.clients).toEqual(["client-a"]);
    expect(result).toMatchObject({
      action: "accept",
      content: { answer: "elicitation" },
    });
  });

  it("discovers logging methods", async () => {
    class LoggingBean {
      seenLevel: LoggingLevel | null = null;

      seenLogger: string | null = null;

      seenData: string | null = null;

      @McpLogging({ clients: ["client-a"] })
      handleLogging(level: LoggingLevel, logger: string, data: string): void {
        this.seenLevel = level;
        this.seenLogger = logger;
        this.seenData = data;
      }
    }

    const provider = new McpLoggingProvider({
      loggingObjects: [new LoggingBean()],
    });

    const specs = provider.getLoggingSpecifications();
    const spec = specs[0];
    expect(spec).toBeDefined();

    await spec!.loggingHandler({
      method: "logging/message",
      params: {
        level: "info" as LoggingLevel,
        logger: "test-logger",
        data: "log data",
      },
    } as unknown as LoggingMessageNotification);

    expect(specs).toHaveLength(1);
    expect(specs[0]?.clients).toEqual(["client-a"]);
  });

  it("discovers progress methods", async () => {
    class ProgressBean {
      seenProgress: ProgressNotification | null = null;

      @McpProgress({ clients: ["client-a"] })
      handleProgress(notification: ProgressNotification): void {
        this.seenProgress = notification;
      }
    }

    const bean = new ProgressBean();
    const provider = new McpProgressProvider({
      progressObjects: [bean],
    });

    const specs = provider.getProgressSpecifications();
    const spec = specs[0];
    expect(spec).toBeDefined();

    await spec!.progressHandler({
      method: "notifications/progress",
      params: {
        progressToken: "token",
        progress: 1,
        total: 2,
      },
    } as unknown as ProgressNotification);

    expect(specs).toHaveLength(1);
    expect(specs[0]?.clients).toEqual(["client-a"]);
    expect(bean.seenProgress?.params.progressToken).toBe("token");
  });

  it("discovers prompt list changed methods", async () => {
    class PromptListChangedBean {
      seenPrompts: Prompt[] | null = null;

      @McpPromptListChanged({ clients: ["client-a"] })
      handlePromptListChanged(updatedPrompts: Prompt[]): void {
        this.seenPrompts = updatedPrompts;
      }
    }

    const bean = new PromptListChangedBean();
    const provider = new McpPromptListChangedProvider({
      promptListChangedObjects: [bean],
    });

    const specs = provider.getPromptListChangedSpecifications();
    const spec = specs[0];
    expect(spec).toBeDefined();

    await spec!.promptListChangeHandler(null, [{ name: "prompt-1" } as Prompt]);

    expect(specs).toHaveLength(1);
    expect(specs[0]?.clients).toEqual(["client-a"]);
    expect(bean.seenPrompts).toHaveLength(1);
  });

  it("discovers resource list changed methods", async () => {
    class ResourceListChangedBean {
      seenResources: Resource[] | null = null;

      @McpResourceListChanged({ clients: ["client-a"] })
      handleResourceListChanged(updatedResources: Resource[]): void {
        this.seenResources = updatedResources;
      }
    }

    const bean = new ResourceListChangedBean();
    const provider = new McpResourceListChangedProvider({
      resourceListChangedObjects: [bean],
    });

    const specs = provider.getResourceListChangedSpecifications();
    const spec = specs[0];
    expect(spec).toBeDefined();

    await spec!.resourceListChangeHandler(null, [
      { uri: "file:///resource.txt", name: "resource" } as Resource,
    ]);

    expect(specs).toHaveLength(1);
    expect(specs[0]?.clients).toEqual(["client-a"]);
    expect(bean.seenResources).toHaveLength(1);
  });

  it("discovers tool list changed methods", async () => {
    class ToolListChangedBean {
      seenTools: Tool[] | null = null;

      @McpToolListChanged({ clients: ["client-a"] })
      handleToolListChanged(updatedTools: Tool[]): void {
        this.seenTools = updatedTools;
      }
    }

    const bean = new ToolListChangedBean();
    const provider = new McpToolListChangedProvider({
      toolListChangedObjects: [bean],
    });

    const specs = provider.getToolListChangedSpecifications();
    const spec = specs[0];
    expect(spec).toBeDefined();

    await spec!.toolListChangeHandler(null, [{ name: "tool-1" } as Tool]);

    expect(specs).toHaveLength(1);
    expect(specs[0]?.clients).toEqual(["client-a"]);
    expect(bean.seenTools).toHaveLength(1);
  });
});
