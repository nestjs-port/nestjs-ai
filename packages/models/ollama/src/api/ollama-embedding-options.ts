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

import type { EmbeddingOptions } from "@nestjs-ai/model";

const NON_SUPPORTED_FIELDS = [
  "model",
  "keep_alive",
  "truncate",
  "dimensions",
] as const;

export interface OllamaEmbeddingOptionsProps extends EmbeddingOptions {
  /**
   * Sets the length of time for Ollama to keep the model loaded. Valid values for this
   * setting are parsed by <a href="https://pkg.go.dev/time#ParseDuration">ParseDuration
   * in Go</a>. Part of Chat completion <a
   * href="https://github.com/ollama/ollama/blob/main/docs/api.md#parameters-1">advanced
   * parameters</a>.
   */
  keepAlive?: string | null;

  /**
   * Truncates the end of each input to fit within context length. Returns error if
   * false and context length is exceeded. Defaults to true.
   */
  truncate?: boolean | null;

  /**
   * Whether to use NUMA. (Default: false)
   */
  useNUMA?: boolean | null;

  /**
   * Prompt processing maximum batch size. (Default: 512)
   */
  numBatch?: number | null;

  /**
   * The number of layers to send to the GPU(s). On macOS, it defaults to 1 to enable
   * metal support, 0 to disable. (Default: -1, which indicates that numGPU should be
   * set dynamically)
   */
  numGPU?: number | null;

  /**
   * When using multiple GPUs this option controls which GPU is used for small tensors
   * for which the overhead of splitting the computation across all GPUs is not
   * worthwhile. The GPU in question will use slightly more VRAM to store a scratch
   * buffer for temporary results. By default, GPU 0 is used.
   */
  mainGPU?: number | null;

  /**
   * (Default: false)
   */
  lowVRAM?: boolean | null;

  /**
   * Load only the vocabulary, not the weights.
   */
  vocabOnly?: boolean | null;

  /**
   * By default, models are mapped into memory, which allows the system to load only the
   * necessary parts of the model as needed. However, if the model is larger than your
   * total amount of RAM or if your system is low on available memory, using mmap might
   * increase the risk of pageouts, negatively impacting performance. Disabling mmap
   * results in slower load times but may reduce pageouts if you're not using mlock.
   * Note that if the model is larger than the total amount of RAM, turning off mmap
   * would prevent the model from loading at all. (Default: null)
   */
  useMMap?: boolean | null;

  /**
   * Lock the model in memory, preventing it from being swapped out when memory-mapped.
   * This can improve performance but trades away some of the advantages of
   * memory-mapping by requiring more RAM to run and potentially slowing down load times
   * as the model loads into RAM. (Default: false)
   */
  useMLock?: boolean | null;

  /**
   * Set the number of threads to use during generation. For optimal performance, it is
   * recommended to set this value to the number of physical CPU cores your system has
   * (as opposed to the logical number of cores). Using the correct number of threads can
   * greatly improve performance. By default, Ollama will detect this value for optimal
   * performance.
   */
  numThread?: number | null;
}

/**
 * Helper class for creating strongly-typed Ollama options.
 *
 * @see <a href="https://github.com/ollama/ollama/blob/main/docs/modelfile.mdx#valid-parameters-and-values">Ollama Valid Parameters and Values</a>
 * @see <a href="https://github.com/ollama/ollama/blob/main/api/types.go">Ollama Types</a>
 */
export class OllamaEmbeddingOptions implements EmbeddingOptions {
  /**
   * NOTE: Synthetic field not part of the official Ollama API. Used to allow overriding
   * the model name with prompt options. Part of Chat completion <a
   * href="https://github.com/ollama/ollama/blob/main/docs/api.md#parameters-1">parameters</a>.
   */
  model: string | null = null;

  /**
   * Sets the length of time for Ollama to keep the model loaded. Valid values for this
   * setting are parsed by <a href="https://pkg.go.dev/time#ParseDuration">ParseDuration
   * in Go</a>. Part of Chat completion <a
   * href="https://github.com/ollama/ollama/blob/main/docs/api.md#parameters-1">advanced
   * parameters</a>.
   */
  keepAlive: string | null = null;

  /**
   * The dimensions of the embedding output. This allows you to specify the size of the
   * embedding vector that should be returned by the model. Not all models support this
   * parameter.
   */
  dimensions: number | null = null;

  /**
   * Truncates the end of each input to fit within context length. Returns error if
   * false and context length is exceeded. Defaults to true.
   */
  truncate: boolean | null = null;

  /**
   * Whether to use NUMA. (Default: false)
   */
  useNUMA: boolean | null = null;

  /**
   * Prompt processing maximum batch size. (Default: 512)
   */
  numBatch: number | null = null;

  /**
   * The number of layers to send to the GPU(s). On macOS, it defaults to 1 to enable
   * metal support, 0 to disable. (Default: -1, which indicates that numGPU should be
   * set dynamically)
   */
  numGPU: number | null = null;

  /**
   * When using multiple GPUs this option controls which GPU is used for small tensors
   * for which the overhead of splitting the computation across all GPUs is not
   * worthwhile. The GPU in question will use slightly more VRAM to store a scratch
   * buffer for temporary results. By default, GPU 0 is used.
   */
  mainGPU: number | null = null;

  /**
   * (Default: false)
   */
  lowVRAM: boolean | null = null;

  /**
   * Load only the vocabulary, not the weights.
   */
  vocabOnly: boolean | null = null;

  /**
   * By default, models are mapped into memory, which allows the system to load only the
   * necessary parts of the model as needed. However, if the model is larger than your
   * total amount of RAM or if your system is low on available memory, using mmap might
   * increase the risk of pageouts, negatively impacting performance. Disabling mmap
   * results in slower load times but may reduce pageouts if you're not using mlock.
   * Note that if the model is larger than the total amount of RAM, turning off mmap
   * would prevent the model from loading at all. (Default: null)
   */
  useMMap: boolean | null = null;

  /**
   * Lock the model in memory, preventing it from being swapped out when memory-mapped.
   * This can improve performance but trades away some of the advantages of
   * memory-mapping by requiring more RAM to run and potentially slowing down load times
   * as the model loads into RAM. (Default: false)
   */
  useMLock: boolean | null = null;

  /**
   * Set the number of threads to use during generation. For optimal performance, it is
   * recommended to set this value to the number of physical CPU cores your system has
   * (as opposed to the logical number of cores). Using the correct number of threads can
   * greatly improve performance. By default, Ollama will detect this value for optimal
   * performance.
   */
  numThread: number | null = null;

  constructor(props: OllamaEmbeddingOptionsProps = {}) {
    this.model = props.model ?? null;
    this.keepAlive = props.keepAlive ?? null;
    this.dimensions = props.dimensions ?? null;
    this.truncate = props.truncate ?? null;
    this.useNUMA = props.useNUMA ?? null;
    this.numBatch = props.numBatch ?? null;
    this.numGPU = props.numGPU ?? null;
    this.mainGPU = props.mainGPU ?? null;
    this.lowVRAM = props.lowVRAM ?? null;
    this.vocabOnly = props.vocabOnly ?? null;
    this.useMMap = props.useMMap ?? null;
    this.useMLock = props.useMLock ?? null;
    this.numThread = props.numThread ?? null;
  }

  /**
   * Filter out the non-supported fields from the options.
   * @param options The options to filter.
   * @returns The filtered options.
   */
  static filterNonSupportedFields(
    options: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(options).filter(
        ([key]) => !NON_SUPPORTED_FIELDS.includes(key as never),
      ),
    );
  }

  static fromOptions(
    fromOptions: OllamaEmbeddingOptions,
  ): OllamaEmbeddingOptions {
    return new OllamaEmbeddingOptions({
      model: fromOptions.model,
      keepAlive: fromOptions.keepAlive,
      truncate: fromOptions.truncate,
      useNUMA: fromOptions.useNUMA,
      numBatch: fromOptions.numBatch,
      numGPU: fromOptions.numGPU,
      mainGPU: fromOptions.mainGPU,
      lowVRAM: fromOptions.lowVRAM,
      vocabOnly: fromOptions.vocabOnly,
      useMMap: fromOptions.useMMap,
      useMLock: fromOptions.useMLock,
      numThread: fromOptions.numThread,
      dimensions: fromOptions.dimensions,
    });
  }

  /**
   * Convert the {@link OllamaEmbeddingOptions} object to a {@link Map} of key/value
   * pairs.
   * @returns The {@link Map} of key/value pairs.
   */
  toMap(): Record<string, unknown> {
    const map: Record<string, unknown> = {};
    if (this.model != null) {
      map.model = this.model;
    }
    if (this.keepAlive != null) {
      map.keep_alive = this.keepAlive;
    }
    if (this.dimensions != null) {
      map.dimensions = this.dimensions;
    }
    if (this.truncate != null) {
      map.truncate = this.truncate;
    }
    if (this.useNUMA != null) {
      map.numa = this.useNUMA;
    }
    if (this.numBatch != null) {
      map.num_batch = this.numBatch;
    }
    if (this.numGPU != null) {
      map.num_gpu = this.numGPU;
    }
    if (this.mainGPU != null) {
      map.main_gpu = this.mainGPU;
    }
    if (this.lowVRAM != null) {
      map.low_vram = this.lowVRAM;
    }
    if (this.vocabOnly != null) {
      map.vocab_only = this.vocabOnly;
    }
    if (this.useMMap != null) {
      map.use_mmap = this.useMMap;
    }
    if (this.useMLock != null) {
      map.use_mlock = this.useMLock;
    }
    if (this.numThread != null) {
      map.num_thread = this.numThread;
    }
    return map;
  }

  copy(): OllamaEmbeddingOptions {
    return OllamaEmbeddingOptions.fromOptions(this);
  }
}
