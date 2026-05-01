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

import { strict as assert } from "node:assert";

import type {
  AudioContent,
  ImageContent,
  ModelHint,
  ModelPreferences,
  SamplingMessage,
  SamplingMessageContentBlock,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";

import type {
  ContextInclusionStrategy,
  ModelPreferenceSpec,
  SamplingSpec,
} from "./mcp-request-context-types.js";

type SamplingMessageContent = SamplingMessageContentBlock;

function isSamplingMessage(
  value: SamplingMessageContent | SamplingMessage | string,
): value is SamplingMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "role" in value &&
    "content" in value
  );
}

export class DefaultSamplingSpec implements SamplingSpec {
  _messages: SamplingMessage[] = [];

  _modelPreferences?: ModelPreferences;

  _systemPrompt?: string;

  _temperature?: number;

  _maxTokens?: number;

  _stopSequences: string[] = [];

  _metadata: Record<string, unknown> = {};

  _meta: Record<string, unknown> = {};

  _includeContextStrategy: ContextInclusionStrategy = "none";

  message(...content: AudioContent[]): SamplingSpec;
  message(...content: ImageContent[]): SamplingSpec;
  message(...content: TextContent[]): SamplingSpec;
  message(...text: string[]): SamplingSpec;
  message(...message: SamplingMessage[]): SamplingSpec;
  message(
    ...args: (SamplingMessageContent | SamplingMessage | string)[]
  ): SamplingSpec {
    for (const arg of args) {
      if (typeof arg === "string") {
        this._messages.push({
          role: "user",
          content: { type: "text", text: arg } satisfies TextContent,
        });
      } else if (isSamplingMessage(arg)) {
        this._messages.push(arg);
      } else {
        this._messages.push({ role: "user", content: arg });
      }
    }
    return this;
  }

  modelPreferences(
    modelPreferenceSpec: (spec: ModelPreferenceSpec) => void,
  ): SamplingSpec {
    const spec = new DefaultModelPreferenceSpec();
    modelPreferenceSpec(spec);

    this._modelPreferences = {
      hints: spec._modelHints,
      costPriority: spec._costPriority,
      speedPriority: spec._speedPriority,
      intelligencePriority: spec._intelligencePriority,
    };
    return this;
  }

  systemPrompt(systemPrompt: string): SamplingSpec {
    this._systemPrompt = systemPrompt;
    return this;
  }

  includeContextStrategy(
    includeContextStrategy: ContextInclusionStrategy,
  ): SamplingSpec {
    this._includeContextStrategy = includeContextStrategy;
    return this;
  }

  temperature(temperature: number): SamplingSpec {
    this._temperature = temperature;
    return this;
  }

  maxTokens(maxTokens: number): SamplingSpec {
    this._maxTokens = maxTokens;
    return this;
  }

  stopSequences(...stopSequences: string[]): SamplingSpec {
    this._stopSequences.push(...stopSequences);
    return this;
  }

  metadata(m: Record<string, unknown>): SamplingSpec;
  metadata(k: string, v: unknown): SamplingSpec;
  metadata(
    mOrKey: Record<string, unknown> | string,
    v?: unknown,
  ): SamplingSpec {
    if (typeof mOrKey === "string") {
      this._metadata[mOrKey] = v;
    } else {
      Object.assign(this._metadata, mOrKey);
    }
    return this;
  }

  meta(m: Record<string, unknown>): SamplingSpec;
  meta(k: string, v: unknown): SamplingSpec;
  meta(mOrKey: Record<string, unknown> | string, v?: unknown): SamplingSpec {
    if (typeof mOrKey === "string") {
      this._meta[mOrKey] = v;
    } else {
      Object.assign(this._meta, mOrKey);
    }
    return this;
  }
}

export class DefaultModelPreferenceSpec implements ModelPreferenceSpec {
  _modelHints: ModelHint[] = [];

  _costPriority?: number;

  _speedPriority?: number;

  _intelligencePriority?: number;

  modelHints(...models: string[]): ModelPreferenceSpec {
    assert(models != null, "Models must not be null");
    this._modelHints.push(...models.map((name): ModelHint => ({ name })));
    return this;
  }

  modelHint(modelHint: string): ModelPreferenceSpec {
    assert(modelHint != null, "Model hint must not be null");
    this._modelHints.push({ name: modelHint });
    return this;
  }

  costPriority(costPriority: number): ModelPreferenceSpec {
    this._costPriority = costPriority;
    return this;
  }

  speedPriority(speedPriority: number): ModelPreferenceSpec {
    this._speedPriority = speedPriority;
    return this;
  }

  intelligencePriority(intelligencePriority: number): ModelPreferenceSpec {
    this._intelligencePriority = intelligencePriority;
    return this;
  }
}
