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

import {
  DefaultToolCallingChatOptions,
  type StructuredOutputChatOptions,
  type ToolCallback,
  type ToolCallingChatOptions,
} from "@nestjs-ai/model";

import { OllamaModel } from "./ollama-model.js";
import type { ThinkOption } from "./think-option.js";

const NON_SUPPORTED_FIELDS = [
  "model",
  "format",
  "keep_alive",
  "truncate",
] as const;

/**
 * Helper class for creating strongly-typed Ollama options.
 *
 * @see {@link https://github.com/ollama/ollama/blob/main/docs/modelfile.mdx#valid-parameters-and-values Ollama Valid Parameters and Values}
 * @see {@link https://github.com/ollama/ollama/blob/main/api/types.go Ollama Types}
 */
export class OllamaChatOptions
  implements ToolCallingChatOptions, StructuredOutputChatOptions
{
  readonly DEFAULT_TOOL_EXECUTION_ENABLED = true as const;

  /**
   * Whether to use NUMA. (Default: false)
   */
  private _useNUMA: boolean | null = null;

  /**
   * Sets the size of the context window used to generate the next token. (Default: 2048)
   */
  private _numCtx: number | null = null;

  /**
   * Prompt processing maximum batch size. (Default: 512)
   */
  private _numBatch: number | null = null;

  /**
   * The number of layers to send to the GPU(s). On macOS, it defaults to 1 to enable
   * metal support, 0 to disable. (Default: -1, which indicates that numGPU should be
   * set dynamically)
   */
  private _numGPU: number | null = null;

  /**
   * When using multiple GPUs this option controls which GPU is used for small tensors
   * for which the overhead of splitting the computation across all GPUs is not
   * worthwhile. The GPU in question will use slightly more VRAM to store a scratch
   * buffer for temporary results. By default, GPU 0 is used.
   */
  private _mainGPU: number | null = null;

  /**
   * (Default: false)
   */
  private _lowVRAM: boolean | null = null;

  /**
   * (Default: true)
   */
  private _f16KV: boolean | null = null;

  /**
   * Return logits for all the tokens, not just the last one. To enable completions to
   * return logprobs, this must be true.
   */
  private _logitsAll: boolean | null = null;

  /**
   * Load only the vocabulary, not the weights.
   */
  private _vocabOnly: boolean | null = null;

  /**
   * By default, models are mapped into memory, which allows the system to load only
   * the necessary parts of the model as needed. However, if the model is larger than
   * your total amount of RAM or if your system is low on available memory, using mmap
   * might increase the risk of pageouts, negatively impacting performance. Disabling
   * mmap results in slower load times but may reduce pageouts if you're not using
   * mlock. Note that if the model is larger than the total amount of RAM, turning off
   * mmap would prevent the model from loading at all. (Default: null)
   */
  private _useMMap: boolean | null = null;

  /**
   * Lock the model in memory, preventing it from being swapped out when memory-mapped.
   * This can improve performance but trades away some of the advantages of
   * memory-mapping by requiring more RAM to run and potentially slowing down load
   * times as the model loads into RAM. (Default: false)
   */
  private _useMLock: boolean | null = null;

  /**
   * Set the number of threads to use during generation. For optimal performance, it is
   * recommended to set this value to the number of physical CPU cores your system has
   * (as opposed to the logical number of cores). Using the correct number of threads
   * can greatly improve performance. By default, Ollama will detect this value for
   * optimal performance.
   */
  private _numThread: number | null = null;

  /**
   * (Default: 4)
   */
  private _numKeep: number | null = null;

  /**
   * Sets the random number seed to use for generation. Setting this to a specific
   * number will make the model generate the same text for the same prompt.
   * (Default: -1)
   */
  private _seed: number | null = null;

  /**
   * Maximum number of tokens to predict when generating text. (Default: 128, -1 =
   * infinite generation, -2 = fill context)
   */
  private _numPredict: number | null = null;

  /**
   * Reduces the probability of generating nonsense. A higher value (e.g. 100) will
   * give more diverse answers, while a lower value (e.g. 10) will be more
   * conservative. (Default: 40)
   */
  topK: number | null = null;

  /**
   * Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse
   * text, while a lower value (e.g., 0.5) will generate more focused and conservative
   * text. (Default: 0.9)
   */
  topP: number | null = null;

  /**
   * Alternative to the top_p, and aims to ensure a balance of quality and variety. The
   * parameter p represents the minimum probability for a token to be considered,
   * relative to the probability of the most likely token. For example, with p=0.05 and
   * the most likely token having a probability of 0.9, logits with a value less than
   * 0.045 are filtered out. (Default: 0.0)
   */
  private _minP: number | null = null;

  /**
   * Tail free sampling is used to reduce the impact of less probable tokens from the
   * output. A higher value (e.g., 2.0) will reduce the impact more, while a value of
   * 1.0 disables this setting. (default: 1)
   */
  private _tfsZ: number | null = null;

  /**
   * (Default: 1.0)
   */
  private _typicalP: number | null = null;

  /**
   * Sets how far back for the model to look back to prevent repetition. (Default: 64,
   * 0 = disabled, -1 = num_ctx)
   */
  private _repeatLastN: number | null = null;

  /**
   * The temperature of the model. Increasing the temperature will make the model
   * answer more creatively. (Default: 0.8)
   */
  temperature: number | null = null;

  /**
   * Sets how strongly to penalize repetitions. A higher value (e.g., 1.5) will
   * penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more
   * lenient. (Default: 1.1)
   */
  private _repeatPenalty: number | null = null;

  /**
   * (Default: 0.0)
   */
  presencePenalty: number | null = null;

  /**
   * (Default: 0.0)
   */
  frequencyPenalty: number | null = null;

  /**
   * Enable Mirostat sampling for controlling perplexity. (default: 0, 0 = disabled,
   * 1 = Mirostat, 2 = Mirostat 2.0)
   */
  private _mirostat: number | null = null;

  /**
   * Controls the balance between coherence and diversity of the output. A lower value
   * will result in more focused and coherent text. (Default: 5.0)
   */
  private _mirostatTau: number | null = null;

  /**
   * Influences how quickly the algorithm responds to feedback from the generated text.
   * A lower learning rate will result in slower adjustments, while a higher learning
   * rate will make the algorithm more responsive. (Default: 0.1)
   */
  private _mirostatEta: number | null = null;

  /**
   * (Default: true)
   */
  private _penalizeNewline: boolean | null = null;

  /**
   * Sets the stop sequences to use. When this pattern is encountered the LLM will
   * stop generating text and return. Multiple stop patterns may be set by specifying
   * multiple separate stop parameters in a modelfile.
   */
  private _stop: string[] | null = null;

  // Following fields are not part of the Ollama Options API but part of the Request.

  /**
   * Synthetic field not part of the official Ollama API.
   * Used to allow overriding the model name with prompt options.
   */
  model: string | null = null;

  /**
   * Sets the desired format of output from the LLM. The only valid values are null or
   * "json".
   */
  private _format: unknown = null;

  /**
   * Sets the length of time for Ollama to keep the model loaded. Valid values for this
   * setting are parsed by {@link https://pkg.go.dev/time#ParseDuration ParseDuration in Go}.
   */
  private _keepAlive: string | null = null;

  /**
   * Truncates the end of each input to fit within context length. Returns error if
   * false and context length is exceeded. Defaults to true.
   */
  private _truncate: boolean | null = null;

  /**
   * The model should think before responding, if supported.
   * <p>
   * Most models (Qwen 3, DeepSeek-v3.1, DeepSeek R1) use boolean enable/disable. The
   * GPT-OSS model requires string levels: "low", "medium", or "high".
   * <p>
   * Default Behavior (Ollama 0.12+):
   * <ul>
   * <li>Thinking-capable models auto-enable thinking by default when this field is not
   * set.</li>
   * <li>Standard models do not enable thinking by default.</li>
   * <li>To explicitly control behavior, use enableThinking() / disableThinking().</li>
   * </ul>
   */
  private _thinkOption: ThinkOption | null = null;

  private _internalToolExecutionEnabled: boolean | null = null;

  /**
   * Tool Function Callbacks to register with the ChatModel.
   * For Prompt Options the toolCallbacks are automatically enabled for the duration of
   * the prompt execution.
   * For Default Options the toolCallbacks are registered but disabled by default. Use
   * the enableFunctions to set the functions from the registry to be used by the
   * ChatModel chat completion requests.
   */
  private _toolCallbacks: ToolCallback[] = [];

  /**
   * List of functions, identified by their names, to configure for function calling in
   * the chat completion requests.
   * Functions with those names must exist in the toolCallbacks registry.
   * The {@link #toolCallbacks} from the PromptOptions are automatically enabled for the
   * duration of the prompt execution. Note that function enabled with the default
   * options are enabled for all chat completion requests. This could impact the token
   * count and the billing. If the functions is set in a prompt options, then the
   * enabled functions are only active for the duration of this prompt execution.
   */
  private _toolNames: Set<string> = new Set();

  private _toolContext: Record<string, unknown> = {};

  static builder(): OllamaChatOptions.Builder {
    return new OllamaChatOptions.Builder();
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

  static fromOptions(fromOptions: OllamaChatOptions): OllamaChatOptions {
    return fromOptions.mutate().build();
  }

  // -------------------
  // Getters and Setters
  // -------------------

  get format(): unknown {
    return this._format;
  }

  setFormat(format: unknown): void {
    this._format = format;
  }

  get keepAlive(): string | null {
    return this._keepAlive;
  }

  setKeepAlive(keepAlive: string | null): void {
    this._keepAlive = keepAlive;
  }

  get useNUMA(): boolean | null {
    return this._useNUMA;
  }

  setUseNUMA(useNUMA: boolean | null): void {
    this._useNUMA = useNUMA;
  }

  get numCtx(): number | null {
    return this._numCtx;
  }

  setNumCtx(numCtx: number | null): void {
    this._numCtx = numCtx;
  }

  get numBatch(): number | null {
    return this._numBatch;
  }

  setNumBatch(numBatch: number | null): void {
    this._numBatch = numBatch;
  }

  get numGPU(): number | null {
    return this._numGPU;
  }

  setNumGPU(numGPU: number | null): void {
    this._numGPU = numGPU;
  }

  get mainGPU(): number | null {
    return this._mainGPU;
  }

  setMainGPU(mainGPU: number | null): void {
    this._mainGPU = mainGPU;
  }

  get lowVRAM(): boolean | null {
    return this._lowVRAM;
  }

  setLowVRAM(lowVRAM: boolean | null): void {
    this._lowVRAM = lowVRAM;
  }

  get f16KV(): boolean | null {
    return this._f16KV;
  }

  setF16KV(f16KV: boolean | null): void {
    this._f16KV = f16KV;
  }

  get logitsAll(): boolean | null {
    return this._logitsAll;
  }

  setLogitsAll(logitsAll: boolean | null): void {
    this._logitsAll = logitsAll;
  }

  get vocabOnly(): boolean | null {
    return this._vocabOnly;
  }

  setVocabOnly(vocabOnly: boolean | null): void {
    this._vocabOnly = vocabOnly;
  }

  get useMMap(): boolean | null {
    return this._useMMap;
  }

  setUseMMap(useMMap: boolean | null): void {
    this._useMMap = useMMap;
  }

  get useMLock(): boolean | null {
    return this._useMLock;
  }

  setUseMLock(useMLock: boolean | null): void {
    this._useMLock = useMLock;
  }

  get numThread(): number | null {
    return this._numThread;
  }

  setNumThread(numThread: number | null): void {
    this._numThread = numThread;
  }

  get numKeep(): number | null {
    return this._numKeep;
  }

  setNumKeep(numKeep: number | null): void {
    this._numKeep = numKeep;
  }

  get seed(): number | null {
    return this._seed;
  }

  setSeed(seed: number | null): void {
    this._seed = seed;
  }

  get maxTokens(): number | null {
    return this.numPredict;
  }

  setMaxTokens(maxTokens: number | null): void {
    this.setNumPredict(maxTokens);
  }

  get numPredict(): number | null {
    return this._numPredict;
  }

  setNumPredict(numPredict: number | null): void {
    this._numPredict = numPredict;
  }

  get minP(): number | null {
    return this._minP;
  }

  setMinP(minP: number | null): void {
    this._minP = minP;
  }

  get tfsZ(): number | null {
    return this._tfsZ;
  }

  setTfsZ(tfsZ: number | null): void {
    this._tfsZ = tfsZ;
  }

  get typicalP(): number | null {
    return this._typicalP;
  }

  setTypicalP(typicalP: number | null): void {
    this._typicalP = typicalP;
  }

  get repeatLastN(): number | null {
    return this._repeatLastN;
  }

  setRepeatLastN(repeatLastN: number | null): void {
    this._repeatLastN = repeatLastN;
  }

  get repeatPenalty(): number | null {
    return this._repeatPenalty;
  }

  setRepeatPenalty(repeatPenalty: number | null): void {
    this._repeatPenalty = repeatPenalty;
  }

  get mirostat(): number | null {
    return this._mirostat;
  }

  setMirostat(mirostat: number | null): void {
    this._mirostat = mirostat;
  }

  get mirostatTau(): number | null {
    return this._mirostatTau;
  }

  setMirostatTau(mirostatTau: number | null): void {
    this._mirostatTau = mirostatTau;
  }

  get mirostatEta(): number | null {
    return this._mirostatEta;
  }

  setMirostatEta(mirostatEta: number | null): void {
    this._mirostatEta = mirostatEta;
  }

  get penalizeNewline(): boolean | null {
    return this._penalizeNewline;
  }

  setPenalizeNewline(penalizeNewline: boolean | null): void {
    this._penalizeNewline = penalizeNewline;
  }

  get stopSequences(): string[] | null {
    return this.stop;
  }

  setStopSequences(stopSequences: string[] | null): void {
    this.setStop(stopSequences);
  }

  get stop(): string[] | null {
    return this._stop;
  }

  setStop(stop: string[] | null): void {
    this._stop = stop;
  }

  get truncate(): boolean | null {
    return this._truncate;
  }

  setTruncate(truncate: boolean | null): void {
    this._truncate = truncate;
  }

  get thinkOption(): ThinkOption | null {
    return this._thinkOption;
  }

  setThinkOption(thinkOption: ThinkOption | null): void {
    this._thinkOption = thinkOption;
  }

  get toolCallbacks(): ToolCallback[] {
    return [...this._toolCallbacks];
  }

  setToolCallbacks(toolCallbacks: ToolCallback[]): void {
    assert(toolCallbacks, "toolCallbacks cannot be null");
    assert(
      toolCallbacks.every((toolCallback) => toolCallback != null),
      "toolCallbacks cannot contain null elements",
    );
    this._toolCallbacks = [...toolCallbacks];
  }

  get toolNames(): Set<string> {
    return new Set(this._toolNames);
  }

  setToolNames(toolNames: Set<string>): void {
    assert(toolNames, "toolNames cannot be null");
    assert(
      [...toolNames].every((toolName) => toolName != null),
      "toolNames cannot contain null elements",
    );
    for (const toolName of toolNames) {
      assert(
        typeof toolName === "string" && toolName.trim().length > 0,
        "toolNames cannot contain empty elements",
      );
    }
    this._toolNames = new Set(toolNames);
  }

  get toolContext(): Record<string, unknown> {
    return { ...this._toolContext };
  }

  setToolContext(toolContext: Record<string, unknown>): void {
    assert(toolContext, "toolContext cannot be null");
    assert(
      Object.keys(toolContext).every((key) => key != null),
      "toolContext cannot contain null keys",
    );
    this._toolContext = { ...toolContext };
  }

  get internalToolExecutionEnabled(): boolean | null {
    return this._internalToolExecutionEnabled;
  }

  setInternalToolExecutionEnabled(
    internalToolExecutionEnabled: boolean | null,
  ): void {
    this._internalToolExecutionEnabled = internalToolExecutionEnabled;
  }

  setModel(model: string | null): void {
    this.model = model;
  }

  setFrequencyPenalty(frequencyPenalty: number | null): void {
    this.frequencyPenalty = frequencyPenalty;
  }

  setPresencePenalty(presencePenalty: number | null): void {
    this.presencePenalty = presencePenalty;
  }

  setTemperature(temperature: number | null): void {
    this.temperature = temperature;
  }

  setTopK(topK: number | null): void {
    this.topK = topK;
  }

  setTopP(topP: number | null): void {
    this.topP = topP;
  }

  get outputSchema(): string | null {
    assert(this._format != null, "format must not be null");
    // If format is a simple string (e.g., "json"), return it as-is
    if (typeof this._format === "string") {
      return this._format;
    }
    // Otherwise, serialize the Map/Object to JSON string (JSON Schema case)
    return JSON.stringify(this._format);
  }

  setOutputSchema(outputSchema: string | null): void {
    this._format = outputSchema != null ? JSON.parse(outputSchema) : null;
  }

  /**
   * Convert the {@link OllamaChatOptions} object to a {@link Map} of key/value pairs.
   * @returns The map of key/value pairs.
   */
  toMap(): Record<string, unknown> {
    const map: Record<string, unknown> = {
      numa: this._useNUMA,
      num_ctx: this._numCtx,
      num_batch: this._numBatch,
      num_gpu: this._numGPU,
      main_gpu: this._mainGPU,
      low_vram: this._lowVRAM,
      f16_kv: this._f16KV,
      logits_all: this._logitsAll,
      vocab_only: this._vocabOnly,
      use_mmap: this._useMMap,
      use_mlock: this._useMLock,
      num_thread: this._numThread,
      num_keep: this._numKeep,
      seed: this._seed,
      num_predict: this._numPredict,
      top_k: this.topK,
      top_p: this.topP,
      min_p: this._minP,
      tfs_z: this._tfsZ,
      typical_p: this._typicalP,
      repeat_last_n: this._repeatLastN,
      temperature: this.temperature,
      repeat_penalty: this._repeatPenalty,
      presence_penalty: this.presencePenalty,
      frequency_penalty: this.frequencyPenalty,
      mirostat: this._mirostat,
      mirostat_tau: this._mirostatTau,
      mirostat_eta: this._mirostatEta,
      penalize_newline: this._penalizeNewline,
      stop: this._stop,
      model: this.model,
      format: this._format,
      keep_alive: this._keepAlive,
      truncate: this._truncate,
    };
    return Object.fromEntries(
      Object.entries(map).filter(([, value]) => value != null),
    );
  }

  copy(): OllamaChatOptions {
    return this.mutate().build();
  }

  mutate(): OllamaChatOptions.Builder {
    return OllamaChatOptions.builder()
      .model(this.model)
      .frequencyPenalty(this.frequencyPenalty)
      .maxTokens(this.numPredict)
      .presencePenalty(this.presencePenalty)
      .stopSequences(this._stop)
      .temperature(this.temperature)
      .topK(this.topK)
      .topP(this.topP)
      .toolCallbacks(this.toolCallbacks)
      .toolNames(this.toolNames)
      .toolContext(this.toolContext)
      .internalToolExecutionEnabled(this.internalToolExecutionEnabled)
      .format(this._format)
      .keepAlive(this._keepAlive)
      .truncate(this._truncate)
      .thinkOption(this._thinkOption)
      .useNUMA(this._useNUMA)
      .numCtx(this._numCtx)
      .numBatch(this._numBatch)
      .numGPU(this._numGPU)
      .mainGPU(this._mainGPU)
      .lowVRAM(this._lowVRAM)
      .f16KV(this._f16KV)
      .logitsAll(this._logitsAll)
      .vocabOnly(this._vocabOnly)
      .useMMap(this._useMMap)
      .useMLock(this._useMLock)
      .numThread(this._numThread)
      .numKeep(this._numKeep)
      .seed(this._seed)
      .minP(this._minP)
      .tfsZ(this._tfsZ)
      .typicalP(this._typicalP)
      .repeatLastN(this._repeatLastN)
      .repeatPenalty(this._repeatPenalty)
      .mirostat(this._mirostat)
      .mirostatTau(this._mirostatTau)
      .mirostatEta(this._mirostatEta)
      .penalizeNewline(this._penalizeNewline);
  }
}

export namespace OllamaChatOptions {
  export class Builder
    extends DefaultToolCallingChatOptions.Builder
    implements StructuredOutputChatOptions.Builder
  {
    protected _useNUMA: boolean | null = null;
    protected _numCtx: number | null = null;
    protected _numBatch: number | null = null;
    protected _numGPU: number | null = null;
    protected _mainGPU: number | null = null;
    protected _lowVRAM: boolean | null = null;
    protected _f16KV: boolean | null = null;
    protected _logitsAll: boolean | null = null;
    protected _vocabOnly: boolean | null = null;
    protected _useMMap: boolean | null = null;
    protected _useMLock: boolean | null = null;
    protected _numThread: number | null = null;
    protected _numKeep: number | null = null;
    protected _seed: number | null = null;
    protected _minP: number | null = null;
    protected _tfsZ: number | null = null;
    protected _typicalP: number | null = null;
    protected _repeatLastN: number | null = null;
    protected _repeatPenalty: number | null = null;
    protected _mirostat: number | null = null;
    protected _mirostatTau: number | null = null;
    protected _mirostatEta: number | null = null;
    protected _penalizeNewline: boolean | null = null;
    protected _format: unknown = null;
    protected _keepAlive: string | null = null;
    protected _truncate: boolean | null = null;
    protected _thinkOption: ThinkOption | null = null;

    override combineWith(other: this): this {
      super.combineWith(other);
      if (other instanceof Builder) {
        if (other._format != null) {
          this._format = other._format;
        }
        if (other._keepAlive != null) {
          this._keepAlive = other._keepAlive;
        }
        if (other._truncate != null) {
          this._truncate = other._truncate;
        }
        if (other._thinkOption != null) {
          this._thinkOption = other._thinkOption;
        }
        if (other._useNUMA != null) {
          this._useNUMA = other._useNUMA;
        }
        if (other._numCtx != null) {
          this._numCtx = other._numCtx;
        }
        if (other._numBatch != null) {
          this._numBatch = other._numBatch;
        }
        if (other._numGPU != null) {
          this._numGPU = other._numGPU;
        }
        if (other._mainGPU != null) {
          this._mainGPU = other._mainGPU;
        }
        if (other._lowVRAM != null) {
          this._lowVRAM = other._lowVRAM;
        }
        if (other._f16KV != null) {
          this._f16KV = other._f16KV;
        }
        if (other._logitsAll != null) {
          this._logitsAll = other._logitsAll;
        }
        if (other._vocabOnly != null) {
          this._vocabOnly = other._vocabOnly;
        }
        if (other._useMMap != null) {
          this._useMMap = other._useMMap;
        }
        if (other._useMLock != null) {
          this._useMLock = other._useMLock;
        }
        if (other._numThread != null) {
          this._numThread = other._numThread;
        }
        if (other._numKeep != null) {
          this._numKeep = other._numKeep;
        }
        if (other._seed != null) {
          this._seed = other._seed;
        }
        if (other._minP != null) {
          this._minP = other._minP;
        }
        if (other._tfsZ != null) {
          this._tfsZ = other._tfsZ;
        }
        if (other._typicalP != null) {
          this._typicalP = other._typicalP;
        }
        if (other._repeatLastN != null) {
          this._repeatLastN = other._repeatLastN;
        }
        if (other._repeatPenalty != null) {
          this._repeatPenalty = other._repeatPenalty;
        }
        if (other._mirostat != null) {
          this._mirostat = other._mirostat;
        }
        if (other._mirostatTau != null) {
          this._mirostatTau = other._mirostatTau;
        }
        if (other._mirostatEta != null) {
          this._mirostatEta = other._mirostatEta;
        }
        if (other._penalizeNewline != null) {
          this._penalizeNewline = other._penalizeNewline;
        }
      }
      return this.self();
    }

    override model(model: string | OllamaModel | null): this {
      if (model == null) {
        super.model(null);
      } else if (model instanceof OllamaModel) {
        super.model(model.id());
      } else {
        super.model(model);
      }
      return this.self();
    }

    // Ollama specific name for maxTokens.
    numPredict(numPredict: number | null): this {
      this.maxTokens(numPredict);
      return this.self();
    }

    // Ollama specific name for stopSequences
    stop(stop: string[] | null): this {
      this.stopSequences(stop);
      return this.self();
    }

    format(format: unknown): this {
      this._format = format;
      return this.self();
    }

    keepAlive(keepAlive: string | null): this {
      this._keepAlive = keepAlive;
      return this.self();
    }

    truncate(truncate: boolean | null): this {
      this._truncate = truncate;
      return this.self();
    }

    useNUMA(useNUMA: boolean | null): this {
      this._useNUMA = useNUMA;
      return this.self();
    }

    numCtx(numCtx: number | null): this {
      this._numCtx = numCtx;
      return this.self();
    }

    numBatch(numBatch: number | null): this {
      this._numBatch = numBatch;
      return this.self();
    }

    numGPU(numGPU: number | null): this {
      this._numGPU = numGPU;
      return this.self();
    }

    mainGPU(mainGPU: number | null): this {
      this._mainGPU = mainGPU;
      return this.self();
    }

    lowVRAM(lowVRAM: boolean | null): this {
      this._lowVRAM = lowVRAM;
      return this.self();
    }

    f16KV(f16KV: boolean | null): this {
      this._f16KV = f16KV;
      return this.self();
    }

    logitsAll(logitsAll: boolean | null): this {
      this._logitsAll = logitsAll;
      return this.self();
    }

    vocabOnly(vocabOnly: boolean | null): this {
      this._vocabOnly = vocabOnly;
      return this.self();
    }

    useMMap(useMMap: boolean | null): this {
      this._useMMap = useMMap;
      return this.self();
    }

    useMLock(useMLock: boolean | null): this {
      this._useMLock = useMLock;
      return this.self();
    }

    numThread(numThread: number | null): this {
      this._numThread = numThread;
      return this.self();
    }

    numKeep(numKeep: number | null): this {
      this._numKeep = numKeep;
      return this.self();
    }

    seed(seed: number | null): this {
      this._seed = seed;
      return this.self();
    }

    minP(minP: number | null): this {
      this._minP = minP;
      return this.self();
    }

    tfsZ(tfsZ: number | null): this {
      this._tfsZ = tfsZ;
      return this.self();
    }

    typicalP(typicalP: number | null): this {
      this._typicalP = typicalP;
      return this.self();
    }

    repeatLastN(repeatLastN: number | null): this {
      this._repeatLastN = repeatLastN;
      return this.self();
    }

    repeatPenalty(repeatPenalty: number | null): this {
      this._repeatPenalty = repeatPenalty;
      return this.self();
    }

    mirostat(mirostat: number | null): this {
      this._mirostat = mirostat;
      return this.self();
    }

    mirostatTau(mirostatTau: number | null): this {
      this._mirostatTau = mirostatTau;
      return this.self();
    }

    mirostatEta(mirostatEta: number | null): this {
      this._mirostatEta = mirostatEta;
      return this.self();
    }

    penalizeNewline(penalizeNewline: boolean | null): this {
      this._penalizeNewline = penalizeNewline;
      return this.self();
    }

    /**
     * Enable thinking mode for the model. The model will include its reasoning
     * process in the response's thinking field.
     *
     * Supported by models: Qwen 3, DeepSeek-v3.1, DeepSeek R1
     */
    enableThinking(): this {
      this._thinkOption = true;
      return this.self();
    }

    /**
     * Disable thinking mode for the model.
     */
    disableThinking(): this {
      this._thinkOption = false;
      return this.self();
    }

    /**
     * Set thinking level to "low" (for GPT-OSS model).
     *
     * GPT-OSS requires one of: low, medium, high. Boolean enable/disable is not
     * supported for this model.
     */
    thinkLow(): this {
      this._thinkOption = "low";
      return this.self();
    }

    /**
     * Set thinking level to "medium" (for GPT-OSS model).
     */
    thinkMedium(): this {
      this._thinkOption = "medium";
      return this.self();
    }

    /**
     * Set thinking level to "high" (for GPT-OSS model).
     */
    thinkHigh(): this {
      this._thinkOption = "high";
      return this.self();
    }

    /**
     * Set the think option explicitly. Use {@link enableThinking},
     * {@link disableThinking}, {@link thinkLow}, {@link thinkMedium}, or
     * {@link thinkHigh} for more convenient alternatives.
     */
    thinkOption(thinkOption: ThinkOption | null): this {
      this._thinkOption = thinkOption;
      return this.self();
    }

    outputSchema(outputSchema: string | null): this {
      if (outputSchema == null) {
        this._format = null;
      } else {
        this._format = JSON.parse(outputSchema);
      }
      return this.self();
    }

    override build(): OllamaChatOptions {
      const options = new OllamaChatOptions();
      if (this._toolCallbacks != null) {
        options.setToolCallbacks(this._toolCallbacks);
      }
      if (this._toolNames != null) {
        options.setToolNames(this._toolNames);
      }
      if (this._toolContext != null) {
        options.setToolContext(this._toolContext);
      }
      options.setInternalToolExecutionEnabled(
        this._internalToolExecutionEnabled,
      );
      options.setModel(this._model);
      options.setFrequencyPenalty(this._frequencyPenalty);
      options.setNumPredict(this._maxTokens);
      options.setPresencePenalty(this._presencePenalty);
      options.setStop(this._stopSequences);
      options.setTemperature(this._temperature);
      options.setTopK(this._topK);
      options.setTopP(this._topP);
      options.setUseNUMA(this._useNUMA);
      options.setNumCtx(this._numCtx);
      options.setNumBatch(this._numBatch);
      options.setNumGPU(this._numGPU);
      options.setMainGPU(this._mainGPU);
      options.setLowVRAM(this._lowVRAM);
      options.setF16KV(this._f16KV);
      options.setLogitsAll(this._logitsAll);
      options.setVocabOnly(this._vocabOnly);
      options.setUseMMap(this._useMMap);
      options.setUseMLock(this._useMLock);
      options.setNumThread(this._numThread);
      options.setNumKeep(this._numKeep);
      options.setSeed(this._seed);
      options.setMinP(this._minP);
      options.setTfsZ(this._tfsZ);
      options.setTypicalP(this._typicalP);
      options.setRepeatLastN(this._repeatLastN);
      options.setRepeatPenalty(this._repeatPenalty);
      options.setMirostat(this._mirostat);
      options.setMirostatTau(this._mirostatTau);
      options.setMirostatEta(this._mirostatEta);
      options.setPenalizeNewline(this._penalizeNewline);
      options.setFormat(this._format);
      options.setKeepAlive(this._keepAlive);
      options.setTruncate(this._truncate);
      options.setThinkOption(this._thinkOption);
      return options;
    }
  }
}
