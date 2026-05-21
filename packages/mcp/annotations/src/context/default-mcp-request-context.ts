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
import { type Logger, LoggerFactory } from "@nestjs-port/core";
import type {
  ClientCapabilities,
  CreateMessageRequest,
  CreateMessageResult,
  ElicitRequest,
  ElicitResult,
  Implementation,
  ListRootsResult,
  LoggingLevel,
  ProgressNotification,
  Request,
} from "@modelcontextprotocol/server";
import type { McpServerExchange } from "@nestjs-ai/mcp-common";

import { DefaultElicitationSpec } from "./default-elicitation-spec.js";
import { DefaultLoggingSpec } from "./default-logging-spec.js";
import { DefaultProgressSpec } from "./default-progress-spec.js";
import { DefaultSamplingSpec } from "./default-sampling-spec.js";
import type {
  ElicitationSchema,
  McpRequestContext,
} from "./mcp-request-context.js";
import type {
  ElicitationSpec,
  LoggingSpec,
  ProgressSpec,
  SamplingSpec,
} from "./mcp-request-context-types.js";
import { StructuredElicitResult } from "./structured-elicit-result.js";

const elicitSchemaCache = new WeakMap<object, Record<string, unknown>>();

export interface DefaultMcpRequestContextProps {
  request: Request;
  exchange: McpServerExchange;
}

export class DefaultMcpRequestContext implements McpRequestContext {
  private static readonly logger: Logger = LoggerFactory.getLogger(
    DefaultMcpRequestContext.name,
  );

  private readonly _request: Request;

  private readonly _exchange: McpServerExchange;

  constructor(props: DefaultMcpRequestContextProps) {
    assert(props.request != null, "Request must not be null");
    assert(props.exchange != null, "Exchange must not be null");
    this._request = props.request;
    this._exchange = props.exchange;
  }

  // Roots

  async rootsEnabled(): Promise<boolean> {
    const caps = this._exchange.getClientCapabilities();
    return !(caps == null || caps.roots == null);
  }

  async roots(): Promise<ListRootsResult> {
    if (!(await this.rootsEnabled())) {
      throw new Error(
        `Roots not supported by the client: ${JSON.stringify(this._exchange.getClientInfo())}`,
      );
    }
    return this._exchange.listRoots();
  }

  // Elicitation

  async elicitEnabled(): Promise<boolean> {
    const caps = this._exchange.getClientCapabilities();
    return !(caps == null || caps.elicitation == null);
  }

  elicit<T>(schema: ElicitationSchema<T>): Promise<StructuredElicitResult<T>>;
  elicit<T>(
    spec: (params: ElicitationSpec) => void,
    schema: ElicitationSchema<T>,
  ): Promise<StructuredElicitResult<T>>;
  elicit(elicitRequest: ElicitRequest): Promise<ElicitResult>;
  async elicit<T>(
    arg1:
      | ElicitationSchema<T>
      | ((params: ElicitationSpec) => void)
      | ElicitRequest,
    arg2?: ElicitationSchema<T>,
  ): Promise<StructuredElicitResult<T> | ElicitResult> {
    if (typeof arg1 === "function") {
      const schema = arg2 as ElicitationSchema<T>;
      assert(schema != null, "Elicitation response type must not be null");
      assert(arg1 != null, "Elicitation params must not be null");
      return this.elicitWithSpec(arg1, schema);
    }
    if (this.isElicitRequest(arg1)) {
      if (!(await this.elicitEnabled())) {
        throw new Error(
          `Elicitation not supported by the client: ${JSON.stringify(this._exchange.getClientInfo())}`,
        );
      }
      assert(arg1 != null, "Elicit request must not be null");
      return this._exchange.createElicitation(arg1);
    }

    const schema = arg1 as ElicitationSchema<T>;
    assert(schema != null, "Elicitation response type must not be null");
    if (!(await this.elicitEnabled())) {
      throw new Error(
        `Elicitation not supported by the client: ${JSON.stringify(this._exchange.getClientInfo())}`,
      );
    }
    const elicitResult = await this.elicitationInternal(
      "Please provide the required information.",
      schema,
      undefined,
    );
    return this.toStructuredResult<T>(elicitResult);
  }

  private async elicitWithSpec<T>(
    params: (spec: ElicitationSpec) => void,
    schema: ElicitationSchema<T>,
  ): Promise<StructuredElicitResult<T>> {
    if (!(await this.elicitEnabled())) {
      throw new Error(
        `Elicitation not supported by the client: ${JSON.stringify(this._exchange.getClientInfo())}`,
      );
    }
    const paramSpec = new DefaultElicitationSpec();
    params(paramSpec);
    const elicitResult = await this.elicitationInternal(
      paramSpec._message ?? "Please provide the required information.",
      schema,
      paramSpec._meta,
    );
    return this.toStructuredResult<T>(elicitResult);
  }

  private toStructuredResult<T>(
    elicitResult: ElicitResult,
  ): StructuredElicitResult<T> {
    if (elicitResult.action !== "accept") {
      return new StructuredElicitResult<T>({
        action: elicitResult.action,
        structuredContent: null,
        meta: elicitResult._meta ?? {},
      });
    }
    return new StructuredElicitResult<T>({
      action: elicitResult.action,
      structuredContent: elicitResult.content as T,
      meta: elicitResult._meta ?? {},
    });
  }

  private async elicitationInternal(
    message: string,
    schema: ElicitationSchema<unknown>,
    meta: Record<string, unknown> | undefined,
  ): Promise<ElicitResult> {
    // TODO add validation for the Elicitation Schema
    // https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation#supported-schema-types

    const requestedSchema = this.generateElicitSchema(schema);

    const elicitRequest = {
      method: "elicitation/create",
      params: {
        message,
        requestedSchema,
        ...(meta != null ? { _meta: meta } : {}),
      },
    } as ElicitRequest;

    return this._exchange.createElicitation(elicitRequest);
  }

  private generateElicitSchema(
    schema: ElicitationSchema<unknown>,
  ): Record<string, unknown> {
    const cached = elicitSchemaCache.get(schema);
    if (cached != null) {
      return cached;
    }
    const jsonSchema = schema["~standard"].jsonSchema.input({
      target: "draft-2020-12",
    });
    if (jsonSchema == null) {
      throw new Error(
        "Elicitation schema must provide a JSON Schema via the StandardSchema spec",
      );
    }
    const cleaned = { ...jsonSchema };
    // remove $schema as elicitation schema does not support it
    delete cleaned.$schema;
    elicitSchemaCache.set(schema, cleaned);
    return cleaned;
  }

  private isElicitRequest(value: unknown): value is ElicitRequest {
    return (
      typeof value === "object" &&
      value !== null &&
      "method" in value &&
      (value as { method: unknown }).method === "elicitation/create"
    );
  }

  // Sampling

  async sampleEnabled(): Promise<boolean> {
    const caps = this._exchange.getClientCapabilities();
    return !(caps == null || caps.sampling == null);
  }

  sample(...messages: string[]): Promise<CreateMessageResult>;
  sample(
    samplingSpec: (spec: SamplingSpec) => void,
  ): Promise<CreateMessageResult>;
  sample(
    createMessageRequest: CreateMessageRequest,
  ): Promise<CreateMessageResult>;
  async sample(
    ...args: string[] | [(spec: SamplingSpec) => void] | [CreateMessageRequest]
  ): Promise<CreateMessageResult> {
    if (args.length === 1 && typeof args[0] === "function") {
      return this.sampleWithSpec(args[0]);
    }
    if (
      args.length === 1 &&
      typeof args[0] === "object" &&
      args[0] !== null &&
      "method" in (args[0] as object)
    ) {
      const request = args[0] as CreateMessageRequest;
      if (!(await this.sampleEnabled())) {
        throw new Error(
          `Sampling not supported by the client: ${JSON.stringify(this._exchange.getClientInfo())}`,
        );
      }
      return this._exchange.createMessage(request);
    }
    return this.sampleWithSpec((s) => s.message(...(args as string[])));
  }

  private async sampleWithSpec(
    samplingSpec: (spec: SamplingSpec) => void,
  ): Promise<CreateMessageResult> {
    if (!(await this.sampleEnabled())) {
      throw new Error(
        `Sampling not supported by the client: ${JSON.stringify(this._exchange.getClientInfo())}`,
      );
    }
    assert(samplingSpec != null, "Sampling spec consumer must not be null");
    const spec = new DefaultSamplingSpec();
    samplingSpec(spec);

    const progressToken = this.getProgressToken();

    const params: CreateMessageRequest["params"] = {
      messages: spec._messages,
      maxTokens:
        spec._maxTokens != null && spec._maxTokens > 0 ? spec._maxTokens : 500,
    };
    if (spec._modelPreferences != null) {
      params.modelPreferences = spec._modelPreferences;
    }
    if (spec._systemPrompt != null) {
      params.systemPrompt = spec._systemPrompt;
    }
    if (spec._temperature != null) {
      params.temperature = spec._temperature;
    }
    if (spec._stopSequences.length > 0) {
      params.stopSequences = spec._stopSequences;
    }
    if (spec._includeContextStrategy != null) {
      params.includeContext = spec._includeContextStrategy;
    }
    const meta: Record<string, unknown> = {};
    if (Object.keys(spec._metadata).length > 0) {
      Object.assign(meta, spec._metadata);
    }
    if (progressToken != null) {
      meta.progressToken = progressToken;
    }
    if (Object.keys(spec._meta).length > 0) {
      Object.assign(meta, spec._meta);
    }
    if (Object.keys(meta).length > 0) {
      params._meta = meta;
    }

    return this._exchange.createMessage({
      method: "sampling/createMessage",
      params,
    });
  }

  // Progress

  progress(percentage: number): Promise<void>;
  progress(progressSpec: (spec: ProgressSpec) => void): Promise<void>;
  progress(progressNotification: ProgressNotification): Promise<void>;
  async progress(
    arg: number | ((spec: ProgressSpec) => void) | ProgressNotification,
  ): Promise<void> {
    if (typeof arg === "number") {
      assert(arg >= 0 && arg <= 100, "Percentage must be between 0 and 100");
      return this.progress((p) =>
        p
          .progress(arg / 100.0)
          .total(1.0)
          .message(null),
      );
    }
    if (typeof arg === "function") {
      return this.progressWithSpec(arg);
    }
    return this._exchange.progressNotification(arg);
  }

  private async progressWithSpec(
    progressSpec: (spec: ProgressSpec) => void,
  ): Promise<void> {
    assert(progressSpec != null, "Progress spec consumer must not be null");
    const spec = new DefaultProgressSpec();
    progressSpec(spec);

    const progressToken = this.getProgressToken();

    if (
      progressToken == null ||
      (typeof progressToken === "string" && progressToken.length === 0)
    ) {
      DefaultMcpRequestContext.logger.warn(
        "Progress notification not supported by the client!",
      );
      return;
    }

    const params: ProgressNotification["params"] = {
      progressToken,
      progress: spec._progress,
    };
    if (spec._total != null) {
      params.total = spec._total;
    }
    if (spec._message != null) {
      params.message = spec._message;
    }
    if (Object.keys(spec._meta).length > 0) {
      params._meta = spec._meta;
    }

    return this._exchange.progressNotification({
      method: "notifications/progress",
      params,
    });
  }

  // Ping

  async ping(): Promise<unknown> {
    return this._exchange.ping();
  }

  // Logging

  async log(logSpec: (spec: LoggingSpec) => void): Promise<void> {
    assert(logSpec != null, "Logging spec consumer must not be null");
    const spec = new DefaultLoggingSpec();
    logSpec(spec);

    return this._exchange.loggingNotification({
      method: "notifications/message",
      params: {
        data: spec._message,
        level: spec._level,
        ...(spec._logger != null ? { logger: spec._logger } : {}),
        ...(Object.keys(spec._meta).length > 0 ? { _meta: spec._meta } : {}),
      },
    });
  }

  async debug(message: string): Promise<void> {
    return this.logInternal(message, "debug");
  }

  async info(message: string): Promise<void> {
    return this.logInternal(message, "info");
  }

  async warn(message: string): Promise<void> {
    return this.logInternal(message, "warning");
  }

  async error(message: string): Promise<void> {
    return this.logInternal(message, "error");
  }

  private async logInternal(
    message: string,
    level: LoggingLevel,
  ): Promise<void> {
    assert(
      message != null && message.length > 0,
      "Log message must not be empty",
    );
    return this._exchange.loggingNotification({
      method: "notifications/message",
      params: { data: message, level },
    });
  }

  // Getters

  request(): Request {
    return this._request;
  }

  exchange(): McpServerExchange {
    return this._exchange;
  }

  sessionId(): string | undefined {
    return this._exchange.sessionId();
  }

  clientInfo(): Implementation | undefined {
    return this._exchange.getClientInfo();
  }

  clientCapabilities(): ClientCapabilities | undefined {
    return this._exchange.getClientCapabilities();
  }

  requestMeta(): Record<string, unknown> | undefined {
    return this._request.params?._meta;
  }

  private getProgressToken(): string | number | undefined {
    return this._request.params?._meta?.progressToken;
  }
}
