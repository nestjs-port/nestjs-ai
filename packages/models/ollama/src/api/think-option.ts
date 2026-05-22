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

export type ThinkLevel = "low" | "medium" | "high";

export type ThinkOption = boolean | ThinkLevel;

/**
 * Represents the thinking option for Ollama models. The think option controls whether
 * models emit their reasoning trace before the final answer.
 *
 * Most models (Qwen 3, DeepSeek-v3.1, DeepSeek R1) accept boolean enable/disable. The
 * GPT-OSS model requires string levels: "low", "medium", or "high".
 *
 * @see ThinkOption.ThinkBoolean
 * @see ThinkOption.ThinkLevel
 */
export namespace ThinkOption {
  /**
   * Boolean-style think option for models that support simple enable/disable. Supported
   * by Qwen 3, DeepSeek-v3.1, and DeepSeek R1 models.
   */
  export const ThinkBoolean = {
    /**
     * Constant for enabled thinking.
     */
    ENABLED: true,

    /**
     * Constant for disabled thinking.
     */
    DISABLED: false,
  } as const;

  /**
   * String-level think option for the GPT-OSS model which requires explicit levels.
   */
  export const ThinkLevel = {
    /**
     * Low thinking level for GPT-OSS.
     */
    LOW: "low",

    /**
     * Medium thinking level for GPT-OSS.
     */
    MEDIUM: "medium",

    /**
     * High thinking level for GPT-OSS.
     */
    HIGH: "high",
  } as const;
}
