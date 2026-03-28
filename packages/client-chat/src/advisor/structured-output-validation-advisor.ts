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
import { EOL } from "node:os";
import {
  HIGHEST_PRECEDENCE,
  LOWEST_PRECEDENCE,
  type Logger,
  LoggerFactory,
} from "@nestjs-ai/commons";
import { UserMessage } from "@nestjs-ai/model";
import type { Observable } from "rxjs";
import { throwError } from "rxjs";
import type { ZodType } from "zod";

import type { ChatClientRequest } from "../chat-client-request";
import type { ChatClientResponse } from "../chat-client-response";
import type {
  CallAdvisor,
  CallAdvisorChain,
  StreamAdvisor,
  StreamAdvisorChain,
} from "./api";

interface ValidationResponse {
  valid: boolean;
  errorMessage: string | null;
}

export interface StructuredOutputValidationAdvisorProps {
  advisorOrder?: number;
  outputSchema: ZodType<unknown>;
  maxRepeatAttempts?: number;
}

export class StructuredOutputValidationAdvisor
  implements CallAdvisor, StreamAdvisor
{
  static readonly DEFAULT_ADVISOR_ORDER = LOWEST_PRECEDENCE - 2000;
  static readonly DEFAULT_MAX_REPEAT_ATTEMPTS = 3;

  private readonly _logger: Logger = LoggerFactory.getLogger(
    StructuredOutputValidationAdvisor.name,
  );
  private readonly _advisorOrder: number;
  private readonly _outputSchema: ZodType<unknown>;
  private readonly _maxRepeatAttempts: number;

  constructor(props: StructuredOutputValidationAdvisorProps) {
    assert(props, "props must not be null");
    assert(props.outputSchema, "outputSchema must not be null");

    const advisorOrder =
      props.advisorOrder ??
      StructuredOutputValidationAdvisor.DEFAULT_ADVISOR_ORDER;
    assert(
      advisorOrder > HIGHEST_PRECEDENCE && advisorOrder < LOWEST_PRECEDENCE,
      "advisorOrder must be between HIGHEST_PRECEDENCE and LOWEST_PRECEDENCE",
    );

    const maxRepeatAttempts =
      props.maxRepeatAttempts ??
      StructuredOutputValidationAdvisor.DEFAULT_MAX_REPEAT_ATTEMPTS;
    assert(
      maxRepeatAttempts >= 0,
      "maxRepeatAttempts must be greater than or equal to 0",
    );

    this._advisorOrder = advisorOrder;
    this._outputSchema = props.outputSchema;
    this._maxRepeatAttempts = maxRepeatAttempts;
  }

  get name(): string {
    return "Structured Output Validation Advisor";
  }

  get order(): number {
    return this._advisorOrder;
  }

  async adviseCall(
    chatClientRequest: ChatClientRequest,
    callAdvisorChain: CallAdvisorChain,
  ): Promise<ChatClientResponse> {
    assert(callAdvisorChain, "callAdvisorChain must not be null");
    assert(chatClientRequest, "chatClientRequest must not be null");

    let chatClientResponse: ChatClientResponse | null = null;
    let repeatCounter = 0;
    let isValidationSuccess = true;
    let processedChatClientRequest = chatClientRequest;

    do {
      repeatCounter++;
      chatClientResponse = await callAdvisorChain
        .copy(this)
        .nextCall(processedChatClientRequest);

      if (
        chatClientResponse.chatResponse == null ||
        !chatClientResponse.chatResponse.hasToolCalls()
      ) {
        const validationResponse =
          this.validateOutputSchema(chatClientResponse);
        isValidationSuccess = validationResponse.valid;

        if (!isValidationSuccess) {
          this._logger.warn(
            `JSON validation failed: ${validationResponse.errorMessage}`,
          );

          const validationErrorMessage = `Output JSON validation failed because of: ${validationResponse.errorMessage}`;
          const augmentedPrompt = chatClientRequest.prompt.augmentUserMessage(
            (userMessage) =>
              new UserMessage({
                content: `${userMessage.text ?? ""}${EOL}${validationErrorMessage}`,
                properties: { ...userMessage.metadata },
                media: [...userMessage.media],
              }),
          );

          processedChatClientRequest = chatClientRequest
            .mutate()
            .prompt(augmentedPrompt)
            .build();
        }
      }
    } while (!isValidationSuccess && repeatCounter <= this._maxRepeatAttempts);

    assert(chatClientResponse != null, "chatClientResponse must not be null");
    return chatClientResponse;
  }

  adviseStream(
    _chatClientRequest: ChatClientRequest,
    _streamAdvisorChain: StreamAdvisorChain,
  ): Observable<ChatClientResponse> {
    return throwError(
      () =>
        new Error(
          "The Structured Output Validation Advisor does not support streaming.",
        ),
    );
  }

  private validateOutputSchema(
    chatClientResponse: ChatClientResponse,
  ): ValidationResponse {
    const json = chatClientResponse.chatResponse?.result?.output?.text;
    if (json == null) {
      this._logger.warn(
        "ChatClientResponse is missing required json output for validation.",
      );
      return {
        valid: false,
        errorMessage: "Missing required json output for validation.",
      };
    }

    this._logger.debug(
      `Validating JSON output against schema. Attempts left: ${this._maxRepeatAttempts}`,
    );

    try {
      const parsed = JSON.parse(json) as unknown;
      this._outputSchema.parse(parsed);
      return { valid: true, errorMessage: null };
    } catch (error) {
      return {
        valid: false,
        errorMessage:
          error instanceof Error ? error.message : "Unknown validation error",
      };
    }
  }
}
