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

import { Usage } from "./usage";

export type DefaultUsageProps = Partial<Usage>;

/**
 * Default implementation of the {@link Usage} abstract class.
 */
export class DefaultUsage extends Usage {
  private readonly _promptTokens: number;
  private readonly _completionTokens: number;
  private readonly _totalTokens: number;
  private readonly _nativeUsage: unknown;
  private readonly _cacheReadInputTokens: number | null;
  private readonly _cacheWriteInputTokens: number | null;

  /**
   * Create a new DefaultUsage with promptTokens, completionTokens, totalTokens and
   * native {@link Usage} object.
   */
  constructor(props: DefaultUsageProps = {}) {
    super();
    this._promptTokens = props.promptTokens ?? 0;
    this._completionTokens = props.completionTokens ?? 0;
    this._totalTokens =
      props.totalTokens ?? this._promptTokens + this._completionTokens;
    this._nativeUsage = props.nativeUsage ?? null;
    this._cacheReadInputTokens = props.cacheReadInputTokens ?? null;
    this._cacheWriteInputTokens = props.cacheWriteInputTokens ?? null;
  }

  get promptTokens(): number {
    return this._promptTokens;
  }

  get completionTokens(): number {
    return this._completionTokens;
  }

  override get totalTokens(): number {
    return this._totalTokens;
  }

  get nativeUsage(): unknown {
    return this._nativeUsage;
  }

  override get cacheReadInputTokens(): number | null {
    return this._cacheReadInputTokens;
  }

  override get cacheWriteInputTokens(): number | null {
    return this._cacheWriteInputTokens;
  }

  toJSON() {
    return {
      promptTokens: this._promptTokens,
      completionTokens: this._completionTokens,
      totalTokens: this._totalTokens,
      cacheReadInputTokens: this._cacheReadInputTokens,
      cacheWriteInputTokens: this._cacheWriteInputTokens,
      nativeUsage: this._nativeUsage,
    };
  }
}
