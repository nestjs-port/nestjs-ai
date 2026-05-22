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

import type { ChatModelDescription } from "@nestjs-ai/model";

/**
 * Helper class for common Ollama models.
 */
export class OllamaModel implements ChatModelDescription {
  static readonly QWEN_2_5_3B = new OllamaModel("qwen2.5:3b");

  /**
   * Qwen 2.5
   */
  static readonly QWEN_2_5_7B = new OllamaModel("qwen2.5");

  /**
   * Flagship vision-language model of Qwen and also a significant leap from the previous
   * Qwen2-VL.
   */
  static readonly QWEN2_5_VL = new OllamaModel("qwen2.5vl");

  /**
   * Qwen3 is the latest generation of large language models in Qwen series, offering a
   * comprehensive suite of dense and mixture-of-experts (MoE) models.
   */
  static readonly QWEN3_7B = new OllamaModel("qwen3:7b");

  /**
   * Qwen3 4B
   */
  static readonly QWEN3_4B = new OllamaModel("qwen3:4b");

  /**
   * Qwen3 4B with thinking support. This variant auto-enables thinking by default in
   * Ollama 0.12+, providing separate reasoning traces in the response.
   * @see OllamaChatOptions#thinkOption
   */
  static readonly QWEN3_4B_THINKING = new OllamaModel("qwen3:4b-thinking");

  /**
   * Qwen3 1.7b
   */
  static readonly QWEN_3_1_7_B = new OllamaModel("qwen3:1.7b");

  /**
   * Qwen3 0.6b
   */
  static readonly QWEN_3_06B = new OllamaModel("qwen3:0.6b");

  /**
   * QwQ is the reasoning model of the Qwen series.
   */
  static readonly QWQ = new OllamaModel("qwq");

  /**
   * Llama 2 is a collection of language models ranging from 7B to 70B parameters.
   */
  static readonly LLAMA2 = new OllamaModel("llama2");

  /**
   * Llama 3 is a collection of language models ranging from 8B and 70B parameters.
   */
  static readonly LLAMA3 = new OllamaModel("llama3");

  /**
   * The 8B language model from Meta.
   */
  static readonly LLAMA3_1 = new OllamaModel("llama3.1");

  /**
   * The Llama 3.2 3B language model from Meta.
   */
  static readonly LLAMA3_2 = new OllamaModel("llama3.2");

  /**
   * The Llama 3.2 Vision 11B language model from Meta.
   */
  static readonly LLAMA3_2_VISION_11b = new OllamaModel("llama3.2-vision");

  /**
   * The Llama 3.2 Vision 90B language model from Meta.
   */
  static readonly LLAMA3_2_VISION_90b = new OllamaModel("llama3.2-vision:90b");

  /**
   * The Llama 3.2 1B language model from Meta.
   */
  static readonly LLAMA3_2_1B = new OllamaModel("llama3.2:1b");

  /**
   * The Llama 3.2 3B language model from Meta.
   */
  static readonly LLAMA3_2_3B = new OllamaModel("llama3.2:3b");

  /**
   * The 7B parameters model
   */
  static readonly MISTRAL = new OllamaModel("mistral");

  /**
   * A 12B model with 128k context length, built by Mistral AI in collaboration with
   * NVIDIA.
   */
  static readonly MISTRAL_NEMO = new OllamaModel("mistral-nemo");

  /**
   * A small vision language model designed to run efficiently on edge devices.
   */
  static readonly MOONDREAM = new OllamaModel("moondream");

  /**
   * The 2.7B uncensored Dolphin model
   */
  static readonly DOLPHIN_PHI = new OllamaModel("dolphin-phi");

  /**
   * The Phi-2 2.7B language model
   */
  static readonly PHI = new OllamaModel("phi");

  /**
   * The Phi-3 3.8B language model
   */
  static readonly PHI3 = new OllamaModel("phi3");

  /**
   * A fine-tuned Mistral model
   */
  static readonly NEURAL_CHAT = new OllamaModel("neural-chat");

  /**
   * Starling-7B model
   */
  static readonly STARLING_LM = new OllamaModel("starling-lm");

  /**
   * Code Llama is based on Llama 2 model
   */
  static readonly CODELLAMA = new OllamaModel("codellama");

  /**
   * Orca Mini is based on Llama and Llama 2 ranging from 3 billion parameters to 70
   * billion
   */
  static readonly ORCA_MINI = new OllamaModel("orca-mini");

  /**
   * Llava is a Large Language and Vision Assistant model
   */
  static readonly LLAVA = new OllamaModel("llava");

  /**
   * Gemma is a lightweight model with 2 billion and 7 billion
   */
  static readonly GEMMA = new OllamaModel("gemma");

  /**
   * The current, most capable model that runs on a single GPU.
   */
  static readonly GEMMA3 = new OllamaModel("gemma3");

  /**
   * Uncensored Llama 2 model
   */
  static readonly LLAMA2_UNCENSORED = new OllamaModel("llama2-uncensored");

  /**
   * A high-performing open embedding model with a large token context window.
   */
  static readonly NOMIC_EMBED_TEXT = new OllamaModel("nomic-embed-text");

  /**
   * State-of-the-art large embedding model from mixedbread.ai
   */
  static readonly MXBAI_EMBED_LARGE = new OllamaModel("mxbai-embed-large");

  /**
   * A multilingual text embedding model with 8B parameters. Supports 100+ languages and
   * features a 32k context window. It offers a high embedding dimension of up to 4096,
   * which supports user-defined output dimensions ranging from 32 to 4096.
   */
  static readonly QWEN3_EMBED_8B = new OllamaModel("qwen3-embedding:8b");

  private constructor(private readonly _id: string) {}

  id(): string {
    return this._id;
  }

  get name(): string {
    return this._id;
  }

  get description(): string {
    return "";
  }

  get version(): string {
    return "";
  }
}
