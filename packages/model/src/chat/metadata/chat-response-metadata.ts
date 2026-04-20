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
import { LoggerFactory } from "@nestjs-port/core";
import { AbstractResponseMetadata, type ResponseMetadata } from "../../model";
import { EmptyRateLimit } from "./empty-rate-limit";
import { EmptyUsage } from "./empty-usage";
import { PromptMetadata } from "./prompt-metadata";
import type { RateLimit } from "./rate-limit";
import type { Usage } from "./usage";

export interface ChatResponseMetadataProps {
  id?: string;
  model?: string;
  rateLimit?: RateLimit;
  usage?: Usage;
  promptMetadata?: PromptMetadata;
  metadata?: Record<string, unknown>;
}

/**
 * Models common AI provider metadata returned in an AI response.
 */
export class ChatResponseMetadata
  extends AbstractResponseMetadata
  implements ResponseMetadata
{
  protected _id: string = ""; // Set to blank to preserve backward compat with previous interface default methods

  protected _model: string = "";

  protected _rateLimit: RateLimit = new EmptyRateLimit();

  protected _usage: Usage = new EmptyUsage();

  protected _promptMetadata: PromptMetadata = PromptMetadata.empty();

  constructor(props: ChatResponseMetadataProps = {}) {
    super();
    this._id = "id" in props ? (props.id ?? "") : "";
    this._model = "model" in props ? (props.model ?? "") : "";
    this._rateLimit =
      "rateLimit" in props
        ? (props.rateLimit as RateLimit)
        : new EmptyRateLimit();
    this._usage = "usage" in props ? (props.usage as Usage) : new EmptyUsage();
    this._promptMetadata =
      "promptMetadata" in props
        ? (props.promptMetadata as PromptMetadata)
        : PromptMetadata.empty();
    for (const [key, value] of Object.entries(props.metadata ?? {})) {
      this.map.set(key, value);
    }
  }

  /**
   * Create a new Builder instance.
   *
   * @returns a new Builder instance
   */
  static builder(): ChatResponseMetadata.Builder {
    return new ChatResponseMetadata.Builder();
  }

  /**
   * A unique identifier for the chat completion operation.
   *
   * @returns unique operation identifier
   */
  get id(): string {
    return this._id;
  }

  /**
   * The model that handled the request.
   *
   * @returns the model that handled the request
   */
  get model(): string {
    return this._model;
  }

  /**
   * Returns AI provider specific metadata on rate limits.
   *
   * @returns AI provider specific metadata on rate limits
   * @see RateLimit
   */
  get rateLimit(): RateLimit {
    return this._rateLimit;
  }

  /**
   * Returns AI provider specific metadata on API usage.
   *
   * @returns AI provider specific metadata on API usage
   * @see Usage
   */
  get usage(): Usage {
    return this._usage;
  }

  /**
   * Returns the prompt metadata gathered by the AI during request processing.
   *
   * @returns the prompt metadata
   */
  get promptMetadata(): PromptMetadata {
    return this._promptMetadata;
  }
}

export namespace ChatResponseMetadata {
  const logger = LoggerFactory.getLogger(ChatResponseMetadata.name);

  export class Builder {
    private _id = "";
    private _model = "";
    private _rateLimit: RateLimit = new EmptyRateLimit();
    private _usage: Usage = new EmptyUsage();
    private _promptMetadata: PromptMetadata = PromptMetadata.empty();
    private readonly _metadata: Record<string, unknown> = {};

    metadata(metadata: Record<string, unknown>): this {
      for (const [key, value] of Object.entries(metadata)) {
        this._metadata[key] = value;
      }
      return this;
    }

    keyValue(key: string, value: unknown): this {
      assert(key != null, "Key must not be null"); // Defensive check
      if (value != null) {
        this._metadata[key] = value;
      } else {
        logger.debug(`Ignore null value for key [${key}]`);
      }
      return this;
    }

    id(id: string): this {
      this._id = id;
      return this;
    }

    model(model: string): this {
      this._model = model;
      return this;
    }

    rateLimit(rateLimit: RateLimit): this {
      this._rateLimit = rateLimit;
      return this;
    }

    usage(usage: Usage): this {
      this._usage = usage;
      return this;
    }

    promptMetadata(promptMetadata: PromptMetadata): this {
      this._promptMetadata = promptMetadata;
      return this;
    }

    build(): ChatResponseMetadata {
      return new ChatResponseMetadata({
        id: this._id,
        model: this._model,
        rateLimit: this._rateLimit,
        usage: this._usage,
        promptMetadata: this._promptMetadata,
        metadata: this._metadata,
      });
    }
  }
}
